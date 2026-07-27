import Foundation
import SwiftData
import SwiftUI

@MainActor
@Observable
final class PulseStore {
    var isUnlocked = false
    var privacyError = ""
    var privacySuccess = false
    var isInitializing = true

    var transactions: [TransactionDTO] = []
    var trips: [TripDTO] = []
    var categoryModel: CategoryModelPayload = DefaultCategoryModel.payload
    var savingsGoal: SavingsGoalDTO = .empty

    var monthOffset = 0
    var editingTransactionID: String?
    var statusMessage = ""
    var statusIsError = false

    var activeSheet: PulseSheet?
    var activeDialog: AppDialogRequest?
    var importPreview: ImportPreviewState?
    var monthLogDeleteMode = false
    var monthLogSelectedIDs: Set<String> = []
    var monthLogFilters = MonthLogFilters()
    var globalSearchQuery = ""
    var globalSearchSort: TransactionSort = .dateDesc
    var globalSearchResults: [TransactionDTO] = []
    var globalSearchHasSearched = false
    var tripSummaryFilter = "all"

    private var modelContext: ModelContext?
    private var statusClearTask: Task<Void, Never>?

    func configure(context: ModelContext) {
        modelContext = context
        if isUITesting {
            isUnlocked = true
        }
        Task { await bootstrap() }
    }

    func bootstrap() async {
        guard let modelContext else { return }
        isInitializing = !isUITesting

        migrateLegacyTransactions(context: modelContext)
        transactions = fetchTransactions(context: modelContext)
        trips = fetchTrips(context: modelContext)
        categoryModel = fetchCategoryModel(context: modelContext)
        savingsGoal = fetchSavingsGoal(context: modelContext)

        if !PulseConstants.privacyGateEnabled || isUITesting {
            isUnlocked = true
        }

        isInitializing = false
    }

    var currentMonthBounds: (start: String, end: String, label: String) {
        PulseDateUtils.monthBounds(for: Date(), offset: monthOffset)
    }

    var monthlyMetrics: MonthlyMetrics {
        let bounds = currentMonthBounds
        return AnalyticsService.monthlyMetrics(for: transactions, monthStart: bounds.start, monthEnd: bounds.end)
    }

    var yearlyMetrics: YearlyMetrics {
        let bounds = currentMonthBounds
        let year = Calendar.current.component(.year, from: PulseDateUtils.dateFromString(bounds.end) ?? Date())
        return AnalyticsService.yearlyMetrics(for: transactions, year: year, monthEnd: bounds.end)
    }

    var parentTotals: [ParentTotal] {
        let bounds = currentMonthBounds
        return AnalyticsService.parentTotals(for: transactions, monthStart: bounds.start, monthEnd: bounds.end)
    }

    var chartSlices: [ChartSlice] {
        let bounds = currentMonthBounds
        return AnalyticsService.chartSlices(for: transactions, monthStart: bounds.start, monthEnd: bounds.end)
    }

    var recentTransactions: [TransactionDTO] {
        Array(AnalyticsService.sortTransactions(transactions, by: .dateDesc).prefix(10))
    }

    var filteredMonthLogTransactions: [TransactionDTO] {
        let bounds = currentMonthBounds
        return AnalyticsService.filterTransactions(
            transactions,
            filters: monthLogFilters,
            monthStart: bounds.start,
            monthEnd: bounds.end
        )
    }

    var savingsMetrics: SavingsMetrics {
        AnalyticsService.savingsMetrics(for: transactions, goal: savingsGoal)
    }

    func lockPrivacyGate() {
        isUnlocked = false
        privacyError = ""
        privacySuccess = false
        persistPrivacyUnlock(false)
    }

    func unlock(with pin: String) {
        guard pin.count == 4 else {
            privacyError = "Enter All 4 Digits."
            privacySuccess = false
            return
        }

        if pin == PulseConstants.privacyPIN {
            privacyError = "Access Granted"
            privacySuccess = true
            persistPrivacyUnlock(true)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                self.isUnlocked = true
            }
        } else {
            privacyError = "Incorrect PIN. Try Again."
            privacySuccess = false
        }
    }

    func setStatus(_ message: String, isError: Bool = false) {
        statusMessage = message
        statusIsError = isError
        statusClearTask?.cancel()
        statusClearTask = Task {
            try? await Task.sleep(for: .seconds(30))
            if !Task.isCancelled {
                statusMessage = ""
            }
        }
    }

    func addOrUpdateTransaction(
        description: String,
        amount: Double,
        date: String,
        type: TransactionType,
        parentCategory: String,
        category: String,
        tripID: String?,
        frequency: RecurrenceFrequency,
        recurrenceCount: Int
    ) {
        guard !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            setStatus("Description Is Required.", isError: true)
            return
        }
        guard amount > 0 else {
            setStatus("Amount Must Be Greater Than 0.", isError: true)
            return
        }

        let normalizedDate = PulseDateUtils.normalizeDate(date)
        let parent = type == .income ? "Income" : parentCategory
        let subcategory = category

        if let editingTransactionID,
           let existing = transactions.first(where: { $0.id == editingTransactionID }) {
            updateTransaction(
                existing,
                date: normalizedDate,
                description: description.trimmingCharacters(in: .whitespacesAndNewlines),
                parentCategory: parent,
                category: subcategory,
                type: type,
                amount: amount,
                tripID: tripID
            )
            cancelEditing()
            setStatus("Transaction Updated.")
            return
        }

        let base = TransactionDTO(
            date: normalizedDate,
            description: description.trimmingCharacters(in: .whitespacesAndNewlines),
            parentCategory: parent,
            tripID: tripID,
            category: subcategory,
            type: type,
            amount: amount
        )

        let created = RecurrenceService.generateTransactions(
            base: base,
            frequency: frequency,
            count: frequency == .none ? 1 : recurrenceCount
        )
        insertTransactions(created)
        setStatus(created.count > 1 ? "\(created.count) Transactions Added." : "Transaction Added.")
    }

    func beginEditing(_ transaction: TransactionDTO) {
        editingTransactionID = transaction.id
        activeSheet = .quickAdd
    }

    func cancelEditing() {
        editingTransactionID = nil
    }

    func deleteTransaction(_ transaction: TransactionDTO) {
        guard let modelContext else { return }
        if let record = fetchTransactionRecord(id: transaction.id, context: modelContext) {
            modelContext.delete(record)
            save(context: modelContext)
        }
        transactions.removeAll { $0.id == transaction.id }
        setStatus("Transaction Deleted.")
    }

    func deleteSelectedMonthLogTransactions() {
        let selected = transactions.filter { monthLogSelectedIDs.contains($0.id) }
        selected.forEach(deleteTransaction)
        monthLogSelectedIDs.removeAll()
        monthLogDeleteMode = false
    }

    func clearAllTransactions() {
        guard let modelContext else { return }
        fetchTransactionRecords(context: modelContext).forEach { modelContext.delete($0) }
        save(context: modelContext)
        transactions.removeAll()
        setStatus("All Transactions Cleared.")
    }

    func createTrip(named name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            setStatus("Trip Name Is Required.", isError: true)
            return
        }
        guard !trips.contains(where: { $0.name.caseInsensitiveCompare(trimmed) == .orderedSame }) else {
            setStatus("Trip Already Exists.", isError: true)
            return
        }

        insertTrip(TripDTO(name: trimmed))
        setStatus("Trip Created.")
    }

    func renameTrip(_ trip: TripDTO, to name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        guard !trips.contains(where: {
            $0.id != trip.id && $0.name.caseInsensitiveCompare(trimmed) == .orderedSame
        }) else {
            setStatus("Trip Already Exists.", isError: true)
            return
        }
        guard let modelContext, let record = fetchTripRecord(id: trip.id, context: modelContext) else { return }
        record.name = trimmed
        save(context: modelContext)
        reloadTrips()
        setStatus("Trip Renamed.")
    }

    func deleteTrip(_ trip: TripDTO) {
        guard let modelContext, let record = fetchTripRecord(id: trip.id, context: modelContext) else { return }
        transactions.indices.forEach { index in
            if transactions[index].tripID == trip.id {
                transactions[index].tripID = nil
            }
        }
        fetchTransactionRecords(context: modelContext)
            .filter { $0.tripID == trip.id }
            .forEach { $0.tripID = nil }

        modelContext.delete(record)
        save(context: modelContext)
        reloadTransactions()
        reloadTrips()
        setStatus("Trip Deleted.")
    }

    func saveSavingsGoal(name: String, targetAmount: Double, bufferMonths: Int) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            setStatus("Savings Goal Name Is Required.", isError: true)
            return
        }
        guard targetAmount > 0 else {
            setStatus("Savings Target Must Be Greater Than 0.", isError: true)
            return
        }
        let safeBuffer = max(0, min(24, bufferMonths))
        savingsGoal = SavingsGoalDTO(name: trimmed, targetAmount: targetAmount, bufferMonths: safeBuffer)
        persistSavingsGoal()
        setStatus("Savings Goal Saved.")
    }

    func saveCategoryModel(_ model: CategoryModelPayload) {
        categoryModel = model
        persistCategoryModel()
        setStatus("Categories Saved.")
    }

    func resetCategoryModel() {
        categoryModel = DefaultCategoryModel.payload
        persistCategoryModel()
        setStatus("Categories Reset To Default.")
    }

    func runGlobalSearch() {
        globalSearchHasSearched = true
        globalSearchResults = AnalyticsService.searchTransactions(
            transactions,
            query: globalSearchQuery,
            sort: globalSearchSort
        )
    }

    func prepareImportPreview(from url: URL) {
        let hasAccess = url.startAccessingSecurityScopedResource()
        defer {
            if hasAccess { url.stopAccessingSecurityScopedResource() }
        }

        do {
            let rows = try SpreadsheetParser.parseRows(from: url)
            let headers = rows.first.map { Array($0.keys).sorted() } ?? []
            let mapping = ImportService.buildMapping(headers: headers)
            importPreview = ImportService.buildPreview(
                rows: rows,
                mapping: mapping,
                existingTransactions: transactions,
                categoryModel: categoryModel
            )
            activeSheet = .importPreview
        } catch {
            setStatus(error.localizedDescription, isError: true)
        }
    }

    func commitImportPreview() {
        guard var preview = importPreview else { return }
        let result = ImportService.commitPreview(preview, existingTrips: trips)
        insertTransactions(result.transactions)
        result.trips.filter { trip in !trips.contains(where: { $0.id == trip.id }) }.forEach(insertTrip)
        importPreview = nil
        setStatus("\(result.transactions.count) Transactions Imported.")
    }

    func updateImportPreviewMapping(_ mapping: ImportColumnMapping) {
        guard let preview = importPreview else { return }
        importPreview = ImportService.buildPreview(
            rows: preview.sourceRows,
            mapping: mapping,
            existingTransactions: transactions,
            categoryModel: categoryModel
        )
    }

    func updateImportPreviewRow(_ row: ImportPreviewRow) {
        guard var preview = importPreview else { return }
        if let index = preview.rows.firstIndex(where: { $0.id == row.id }) {
            var updated = row
            updated.isEdited = true
            updated.status = row.amount > 0
                && !row.description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                && PulseDateUtils.normalizeDateIfValid(row.date) != nil
                ? .ready
                : .invalid
            preview.rows[index] = updated
            preview.rows = revalidatedImportRows(preview.rows)
            importPreview = preview
        }
    }

    func exportBackupData() -> Data {
        Data(ExportService.backupCSV(transactions: transactions, trips: trips).utf8)
    }

    func exportWorkbookData() throws -> Data {
        try ExportService.exportWorkbookData(transactions: transactions, trips: trips)
    }

    func tripName(for id: String?) -> String {
        guard let id, let trip = trips.first(where: { $0.id == id }) else { return "" }
        return trip.name
    }

    func tripSpending(for tripID: String?) -> Double {
        guard let tripID else { return 0 }
        return transactions.filter { $0.tripID == tripID && $0.type == .expense }.reduce(0) { $0 + $1.amount }
    }

    func tripLinkedCount(for tripID: String) -> Int {
        transactions.filter { $0.tripID == tripID }.count
    }

    private func revalidatedImportRows(_ rows: [ImportPreviewRow]) -> [ImportPreviewRow] {
        let existingKeys = Set(transactions.map {
            DuplicateKeyBuilder.build(date: $0.date, description: $0.description, type: $0.type, amount: $0.amount)
        })
        var batchKeys: Set<String> = []

        return rows.map { row in
            var updated = row
            guard row.amount > 0,
                  !row.description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  PulseDateUtils.normalizeDateIfValid(row.date) != nil else {
                updated.status = .invalid
                return updated
            }

            let key = DuplicateKeyBuilder.build(
                date: row.date,
                description: row.description,
                type: row.type,
                amount: row.amount
            )
            if existingKeys.contains(key) {
                updated.status = .duplicate
            } else if batchKeys.contains(key) {
                updated.status = .duplicateFile
            } else {
                updated.status = .ready
                batchKeys.insert(key)
            }
            return updated
        }
    }

    func presentConfirm(title: String, message: String, destructive: Bool = false, confirmTitle: String = "Confirm", action: @escaping () -> Void) {
        activeDialog = AppDialogRequest(
            title: title,
            message: message,
            confirmTitle: confirmTitle,
            cancelTitle: "Cancel",
            isDestructive: destructive,
            mode: .confirm
        )
        pendingDialogAction = action
    }

    func presentPrompt(title: String, message: String, defaultValue: String = "", action: @escaping (String) -> Void) {
        activeDialog = AppDialogRequest(
            title: title,
            message: message,
            confirmTitle: "Save",
            cancelTitle: "Cancel",
            isDestructive: false,
            mode: .prompt(defaultValue: defaultValue)
        )
        pendingPromptAction = action
    }

    var pendingDialogAction: (() -> Void)?
    var pendingPromptAction: ((String) -> Void)?

    func confirmDialog(input: String? = nil) {
        if case .prompt = activeDialog?.mode, let input {
            pendingPromptAction?(input)
        } else {
            pendingDialogAction?()
        }
        activeDialog = nil
        pendingDialogAction = nil
        pendingPromptAction = nil
    }

    func cancelDialog() {
        activeDialog = nil
        pendingDialogAction = nil
        pendingPromptAction = nil
    }

    private func insertTransactions(_ items: [TransactionDTO]) {
        guard let modelContext else { return }
        for item in items {
            modelContext.insert(
                TransactionRecord(
                    id: item.id,
                    date: item.date,
                    transactionDescription: item.description,
                    parentCategory: item.parentCategory,
                    tripID: item.tripID,
                    category: item.category,
                    type: item.type,
                    amount: item.amount,
                    createdAt: item.createdAt
                )
            )
        }
        save(context: modelContext)
        reloadTransactions()
    }

    private func updateTransaction(
        _ transaction: TransactionDTO,
        date: String,
        description: String,
        parentCategory: String,
        category: String,
        type: TransactionType,
        amount: Double,
        tripID: String?
    ) {
        guard let modelContext, let record = fetchTransactionRecord(id: transaction.id, context: modelContext) else { return }
        record.date = date
        record.transactionDescription = description
        record.parentCategory = parentCategory
        record.category = category
        record.type = type
        record.amount = amount
        record.tripID = tripID
        save(context: modelContext)
        reloadTransactions()
    }

    private func insertTrip(_ trip: TripDTO) {
        guard let modelContext else { return }
        modelContext.insert(
            TripRecord(
                id: trip.id,
                name: trip.name,
                startDate: trip.startDate,
                endDate: trip.endDate,
                createdAt: trip.createdAt,
                archived: trip.archived
            )
        )
        save(context: modelContext)
        reloadTrips()
    }

    private func reloadTransactions() {
        guard let modelContext else { return }
        transactions = fetchTransactions(context: modelContext)
    }

    private func reloadTrips() {
        guard let modelContext else { return }
        trips = fetchTrips(context: modelContext)
    }

    private func persistCategoryModel() {
        guard let modelContext else { return }
        let data = (try? JSONEncoder().encode(categoryModel)) ?? Data()
        if let record = fetchCategoryModelRecord(context: modelContext) {
            record.payloadJSON = data
            record.updatedAt = .now
        } else {
            modelContext.insert(CategoryModelRecord(payloadJSON: data))
        }
        save(context: modelContext)
    }

    private func persistSavingsGoal() {
        guard let modelContext else { return }
        if savingsGoal.name.isEmpty || savingsGoal.targetAmount <= 0 {
            if let record = fetchSavingsGoalRecord(context: modelContext) {
                modelContext.delete(record)
                save(context: modelContext)
            }
            return
        }

        if let record = fetchSavingsGoalRecord(context: modelContext) {
            record.name = savingsGoal.name
            record.targetAmount = savingsGoal.targetAmount
            record.bufferMonths = savingsGoal.bufferMonths
            record.updatedAt = .now
        } else {
            modelContext.insert(
                SavingsGoalRecord(
                    name: savingsGoal.name,
                    targetAmount: savingsGoal.targetAmount,
                    bufferMonths: savingsGoal.bufferMonths
                )
            )
        }
        save(context: modelContext)
    }

    private func save(context: ModelContext) {
        do {
            try context.save()
        } catch {
            setStatus("Could Not Save Changes.", isError: true)
        }
    }

    private func migrateLegacyTransactions(context: ModelContext) {
        let healthKeywords = [
            "doctor", "dentist", "dental", "medicine", "medication", "prescription",
            "pharmacy", "glasses", "contacts", "vision", "optometrist", "clinic",
            "hospital", "urgent care", "copay", "therapy", "health"
        ]
        var changed = false

        for record in fetchTransactionRecords(context: context) {
            if record.parentCategory == "Personal Expenses" {
                record.parentCategory = "Personal"
                changed = true
            }
            if record.category == "Paycheck/Salary" {
                record.category = "Salary"
                changed = true
            }
            if record.parentCategory == "Car", record.category == "Other" {
                record.category = "Other Car"
                changed = true
            }
            if record.parentCategory == "Travel", record.category == "Rental" {
                record.category = "Transportation"
                changed = true
            }

            let description = record.transactionDescription.lowercased()
            if record.type == .expense,
               record.parentCategory == "Personal",
               record.category == "Other",
               healthKeywords.contains(where: description.contains) {
                record.parentCategory = "Expenses"
                record.category = "Necessities"
                changed = true
            }
        }

        if changed {
            save(context: context)
        }
    }

    private func fetchTransactions(context: ModelContext) -> [TransactionDTO] {
        let descriptor = FetchDescriptor<TransactionRecord>(sortBy: [SortDescriptor(\.createdAt, order: .reverse)])
        return (try? context.fetch(descriptor))?.map(TransactionDTO.init) ?? []
    }

    private func fetchTrips(context: ModelContext) -> [TripDTO] {
        let descriptor = FetchDescriptor<TripRecord>(sortBy: [SortDescriptor(\.createdAt, order: .reverse)])
        return (try? context.fetch(descriptor))?.filter { !$0.archived }.map(TripDTO.init) ?? []
    }

    private func fetchCategoryModel(context: ModelContext) -> CategoryModelPayload {
        guard let record = fetchCategoryModelRecord(context: context),
              let payload = try? JSONDecoder().decode(CategoryModelPayload.self, from: record.payloadJSON) else {
            return DefaultCategoryModel.payload
        }
        return payload
    }

    private func fetchSavingsGoal(context: ModelContext) -> SavingsGoalDTO {
        guard let record = fetchSavingsGoalRecord(context: context) else { return .empty }
        return SavingsGoalDTO(from: record)
    }

    private func fetchTransactionRecords(context: ModelContext) -> [TransactionRecord] {
        (try? context.fetch(FetchDescriptor<TransactionRecord>())) ?? []
    }

    private func fetchTransactionRecord(id: String, context: ModelContext) -> TransactionRecord? {
        var descriptor = FetchDescriptor<TransactionRecord>(predicate: #Predicate { $0.id == id })
        descriptor.fetchLimit = 1
        return try? context.fetch(descriptor).first
    }

    private func fetchTripRecord(id: String, context: ModelContext) -> TripRecord? {
        var descriptor = FetchDescriptor<TripRecord>(predicate: #Predicate { $0.id == id })
        descriptor.fetchLimit = 1
        return try? context.fetch(descriptor).first
    }

    private func fetchCategoryModelRecord(context: ModelContext) -> CategoryModelRecord? {
        var descriptor = FetchDescriptor<CategoryModelRecord>()
        descriptor.fetchLimit = 1
        return try? context.fetch(descriptor).first
    }

    private func fetchSavingsGoalRecord(context: ModelContext) -> SavingsGoalRecord? {
        var descriptor = FetchDescriptor<SavingsGoalRecord>()
        descriptor.fetchLimit = 1
        return try? context.fetch(descriptor).first
    }

    private func fetchAppPreferences(context: ModelContext) -> AppPreferenceRecord? {
        var descriptor = FetchDescriptor<AppPreferenceRecord>(predicate: #Predicate { $0.id == "default" })
        descriptor.fetchLimit = 1
        return try? context.fetch(descriptor).first
    }

    private func persistPrivacyUnlock(_ unlocked: Bool) {
        guard let modelContext else { return }
        if let record = fetchAppPreferences(context: modelContext) {
            record.privacyUnlocked = unlocked
        } else {
            modelContext.insert(AppPreferenceRecord(privacyUnlocked: unlocked))
        }
        save(context: modelContext)
    }

    private var isUITesting: Bool {
        ProcessInfo.processInfo.arguments.contains("-uiTesting")
    }
}

enum PulseSheet: Identifiable, Equatable {
    case quickAdd
    case monthLog
    case globalSearch
    case tripSummary
    case manageTrips
    case importPreview
    case settings
    case savings

    var id: String {
        switch self {
        case .quickAdd: "quickAdd"
        case .monthLog: "monthLog"
        case .globalSearch: "globalSearch"
        case .tripSummary: "tripSummary"
        case .manageTrips: "manageTrips"
        case .importPreview: "importPreview"
        case .settings: "settings"
        case .savings: "savings"
        }
    }
}
