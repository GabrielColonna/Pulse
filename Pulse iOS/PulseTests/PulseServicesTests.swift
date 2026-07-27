import SwiftData
import XCTest
@testable import Pulse

final class PulseServicesTests: XCTestCase {
    func testClassificationFromKeywords() {
        let model = DefaultCategoryModel.payload
        let result = ClassificationService.suggestCategory(from: "Chipotle lunch", type: .expense, model: model)
        XCTAssertEqual(result.parentCategory, "Personal")
        XCTAssertEqual(result.category, "Food")
    }

    func testRecurrenceWeeklyDates() {
        let shifted = PulseDateUtils.shiftDateByFrequency("2026-01-01", frequency: .weekly, occurrenceIndex: 2)
        XCTAssertEqual(shifted, "2026-01-15")
    }

    func testMonthlyRecurrenceClampsToLastDay() {
        let shifted = PulseDateUtils.shiftDateByFrequency("2026-01-31", frequency: .monthly, occurrenceIndex: 1)
        XCTAssertEqual(shifted, "2026-02-28")
    }

    func testMonthlyMetrics() {
        let transactions = [
            TransactionDTO(date: "2026-07-01", description: "Pay", parentCategory: "Income", category: "Salary", type: .income, amount: 1000),
            TransactionDTO(date: "2026-07-10", description: "Food", parentCategory: "Personal", category: "Food", type: .expense, amount: 200)
        ]
        let metrics = AnalyticsService.monthlyMetrics(for: transactions, monthStart: "2026-07-01", monthEnd: "2026-07-31")
        XCTAssertEqual(metrics.income, 1000)
        XCTAssertEqual(metrics.spending, 200)
        XCTAssertEqual(metrics.net, 800)
    }

    func testYearlyMetricsIncludeEntireSelectedYear() {
        let transactions = [
            TransactionDTO(date: "2026-02-01", description: "Pay", parentCategory: "Income", category: "Salary", type: .income, amount: 1000),
            TransactionDTO(date: "2026-11-01", description: "Bonus", parentCategory: "Income", category: "Salary", type: .income, amount: 500)
        ]
        let metrics = AnalyticsService.yearlyMetrics(for: transactions, year: 2026, monthEnd: "2026-02-28")
        XCTAssertEqual(metrics.income, 1500)
    }

    func testParentTotalsIncludeIncomeAndExpense() {
        let transactions = [
            TransactionDTO(date: "2026-07-01", description: "Pay", parentCategory: "Income", category: "Salary", type: .income, amount: 1000),
            TransactionDTO(date: "2026-07-02", description: "Gas", parentCategory: "Car", category: "Gas", type: .expense, amount: 50)
        ]
        let totals = AnalyticsService.parentTotals(for: transactions, monthStart: "2026-07-01", monthEnd: "2026-07-31")
        XCTAssertEqual(totals.first(where: { $0.parentCategory == "Income" })?.amount, 1000)
        XCTAssertEqual(totals.first(where: { $0.parentCategory == "Car" })?.amount, 50)
    }

    func testChartPercentageUsesParentTotal() {
        let transactions = [
            TransactionDTO(date: "2026-07-01", description: "Gas", parentCategory: "Car", category: "Gas", type: .expense, amount: 75),
            TransactionDTO(date: "2026-07-02", description: "Toll", parentCategory: "Car", category: "Tolls", type: .expense, amount: 25),
            TransactionDTO(date: "2026-07-03", description: "Hotel", parentCategory: "Travel", category: "Hotel", type: .expense, amount: 400)
        ]
        let car = AnalyticsService.chartSlices(
            for: transactions,
            monthStart: "2026-07-01",
            monthEnd: "2026-07-31"
        ).first(where: { $0.parentCategory == "Car" })
        XCTAssertEqual(car?.subcategoryBreakdown.first(where: { $0.name == "Gas" })?.percentage, 75)
    }

    func testDuplicateKey() {
        let key = DuplicateKeyBuilder.build(date: "2026-07-01", description: "Coffee", type: .expense, amount: 4.5)
        XCTAssertEqual(key, "2026-07-01|coffee|expense|4.50")
    }

    func testSavingsMetricsComfortBuffer() {
        let transactions = [
            TransactionDTO(date: "2026-01-01", description: "Pay", parentCategory: "Income", category: "Salary", type: .income, amount: 3000),
            TransactionDTO(date: "2026-01-05", description: "Rent", parentCategory: "Expenses", category: "Memberships", type: .expense, amount: 1000),
            TransactionDTO(date: "2026-02-01", description: "Pay", parentCategory: "Income", category: "Salary", type: .income, amount: 3000),
            TransactionDTO(date: "2026-02-05", description: "Rent", parentCategory: "Expenses", category: "Memberships", type: .expense, amount: 1000)
        ]
        let goal = SavingsGoalDTO(name: "Emergency", targetAmount: 2000, bufferMonths: 2)
        let metrics = AnalyticsService.savingsMetrics(for: transactions, goal: goal)
        XCTAssertEqual(metrics.currentSaved, 4000)
        XCTAssertEqual(metrics.comfortBuffer, 2000)
        XCTAssertEqual(metrics.comfortableSaved, 2000)
    }

    func testImportPreviewMarksDuplicate() {
        let existing = [
            TransactionDTO(date: "2026-07-01", description: "Coffee", parentCategory: "Personal", category: "Food", type: .expense, amount: 5)
        ]
        let rows: [[String: String]] = [
            ["Date": "2026-07-01", "Description": "Coffee", "Amount": "5", "Type": "expense"]
        ]
        let mapping = ImportColumnMapping(
            date: "Date",
            description: "Description",
            amount: "Amount",
            type: "Type",
            parentCategory: "",
            category: "",
            trip: ""
        )
        let preview = ImportService.buildPreview(
            rows: rows,
            mapping: mapping,
            existingTransactions: existing,
            categoryModel: DefaultCategoryModel.payload
        )
        XCTAssertEqual(preview.rows.first?.status, .duplicate)
    }

    func testImportInfersNegativeAmountAsExpense() {
        let rows = [["Date": "2026-07-01", "Description": "Coffee", "Amount": "-5"]]
        let preview = ImportService.buildPreview(
            rows: rows,
            mapping: mapping,
            existingTransactions: [],
            categoryModel: DefaultCategoryModel.payload
        )
        XCTAssertEqual(preview.rows.first?.type, .expense)
        XCTAssertEqual(preview.rows.first?.amount, 5)
        XCTAssertEqual(preview.rows.first?.status, .ready)
    }

    func testImportRejectsInvalidDate() {
        let rows = [["Date": "not-a-date", "Description": "Coffee", "Amount": "5"]]
        let preview = ImportService.buildPreview(
            rows: rows,
            mapping: mapping,
            existingTransactions: [],
            categoryModel: DefaultCategoryModel.payload
        )
        XCTAssertEqual(preview.rows.first?.status, .invalid)
    }

    func testImportDetectsDuplicateWithinFile() {
        let row = ["Date": "2026-07-01", "Description": "Coffee", "Amount": "5", "Type": "expense"]
        let preview = ImportService.buildPreview(
            rows: [row, row],
            mapping: mapping,
            existingTransactions: [],
            categoryModel: DefaultCategoryModel.payload
        )
        XCTAssertEqual(preview.rows.map(\.status), [.ready, .duplicateFile])
    }

    func testLegacyAliasNormalization() {
        let assignment = ClassificationService.normalizeCategory(
            value: "GROC",
            parentCategory: nil,
            type: .expense,
            description: "",
            model: DefaultCategoryModel.payload
        )
        XCTAssertEqual(assignment, CategoryAssignment(parentCategory: "Expenses", category: "Groceries"))
    }

    func testCSVParsingAndImportCommit() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("\(UUID().uuidString).csv")
        defer { try? FileManager.default.removeItem(at: url) }
        try "Date,Description,Amount,Type,Trip\n2026-07-01,\"Coffee, Shop\",5,expense,Miami\n"
            .write(to: url, atomically: true, encoding: .utf8)

        let rows = try SpreadsheetParser.parseCSV(from: url)
        XCTAssertEqual(rows.first?["Description"], "Coffee, Shop")
        let preview = ImportService.buildPreview(
            rows: rows,
            mapping: ImportService.buildMapping(headers: rows.first.map { Array($0.keys) } ?? []),
            existingTransactions: [],
            categoryModel: DefaultCategoryModel.payload
        )
        let result = ImportService.commitPreview(preview, existingTrips: [])
        XCTAssertEqual(result.transactions.count, 1)
        XCTAssertEqual(result.trips.first?.name, "Miami")
    }

    func testXLSXExportCreatesZipWorkbook() throws {
        let data = try ExportService.exportWorkbookData(
            transactions: [
                TransactionDTO(date: "2026-07-01", description: "Pay", parentCategory: "Income", category: "Salary", type: .income, amount: 1000)
            ],
            trips: []
        )
        XCTAssertEqual(Array(data.prefix(2)), [0x50, 0x4B])
    }

    @MainActor
    func testModelContainerFactoryCreatesPersistentContainer() {
        let container = ModelContainerFactory.makePersistentContainer()
        XCTAssertNotNil(container)
    }

    func testPrivacyPreferenceRecordRoundTrip() throws {
        let container = try ModelContainerFactory.makeContainer(isStoredInMemoryOnly: true)
        let context = ModelContext(container)
        context.insert(AppPreferenceRecord(privacyUnlocked: true))
        try context.save()

        var descriptor = FetchDescriptor<AppPreferenceRecord>(predicate: #Predicate { $0.id == "default" })
        descriptor.fetchLimit = 1
        let record = try context.fetch(descriptor).first
        XCTAssertEqual(record?.privacyUnlocked, true)
    }

    private var mapping: ImportColumnMapping {
        ImportColumnMapping(
            date: "Date",
            description: "Description",
            amount: "Amount",
            type: "Type",
            parentCategory: "",
            category: "",
            trip: "Trip"
        )
    }
}
