import Foundation

enum PulseDateUtils {
    static func formatDateParts(year: Int, month: Int, day: Int) -> String {
        String(format: "%04d-%02d-%02d", year, month, day)
    }

    static func normalizeDate(_ value: Any?) -> String {
        normalizeDateIfValid(value) ?? normalizeDate(Date())
    }

    static func normalizeDateIfValid(_ value: Any?) -> String? {
        if let string = value as? String {
            let raw = string.trimmingCharacters(in: .whitespacesAndNewlines)
            if let match = raw.range(of: #"^(\d{4})-(\d{1,2})-(\d{1,2})$"#, options: .regularExpression) {
                let parts = raw[match].split(separator: "-").compactMap { Int($0) }
                if parts.count == 3 {
                    let normalized = formatDateParts(year: parts[0], month: parts[1], day: parts[2])
                    return dateFromString(normalized).map { _ in normalized }
                }
            }
            if let match = raw.range(of: #"^(\d{1,2})/(\d{1,2})/(\d{4})$"#, options: .regularExpression) {
                let parts = raw[match].split(separator: "/").compactMap { Int($0) }
                if parts.count == 3 {
                    let normalized = formatDateParts(year: parts[2], month: parts[0], day: parts[1])
                    return dateFromString(normalized).map { _ in normalized }
                }
            }
        }

        if let date = value as? Date {
            let calendar = Calendar.current
            return formatDateParts(
                year: calendar.component(.year, from: date),
                month: calendar.component(.month, from: date),
                day: calendar.component(.day, from: date)
            )
        }

        if let number = value as? Double, number > 0 {
            let base = Date(timeIntervalSince1970: 0)
            guard let date = Calendar.current.date(byAdding: .day, value: Int(number) - 25569, to: base) else {
                return nil
            }
            return normalizeDate(date)
        }

        if let string = value as? String, !string.isEmpty,
           let parsed = ISO8601DateFormatter().date(from: string) ?? DateFormatter.localizedFormatter.date(from: string) {
            return normalizeDate(parsed)
        }

        return nil
    }

    static func normalizeAmount(_ value: Any?) -> Double {
        if let number = value as? Double { return number }
        if let number = value as? Int { return Double(number) }

        let raw = String(describing: value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !raw.isEmpty else { return .nan }

        var cleaned = raw.replacingOccurrences(of: "$", with: "")
            .replacingOccurrences(of: ",", with: "")

        if cleaned.hasPrefix("("), cleaned.hasSuffix(")") {
            cleaned = "-" + cleaned.dropFirst().dropLast()
        }

        return Double(cleaned) ?? .nan
    }

    static func addDays(to dateStr: String, days: Int) -> String {
        guard let date = dateFromString(dateStr) else { return normalizeDate(dateStr) }
        let shifted = Calendar.current.date(byAdding: .day, value: days, to: date) ?? date
        return normalizeDate(shifted)
    }

    static func addMonths(to dateStr: String, months: Int) -> String {
        guard let date = dateFromString(dateStr) else { return normalizeDate(dateStr) }
        let shifted = Calendar.current.date(byAdding: .month, value: months, to: date) ?? date
        return normalizeDate(shifted)
    }

    static func shiftDateByFrequency(_ dateStr: String, frequency: RecurrenceFrequency, occurrenceIndex: Int) -> String {
        guard occurrenceIndex > 0, frequency != .none else { return normalizeDate(dateStr) }

        switch frequency {
        case .weekly: return addDays(to: dateStr, days: 7 * occurrenceIndex)
        case .biweekly: return addDays(to: dateStr, days: 14 * occurrenceIndex)
        case .monthly: return addMonths(to: dateStr, months: occurrenceIndex)
        case .none: return normalizeDate(dateStr)
        }
    }

    static func monthKey(for dateStr: String) -> String {
        String(dateStr.prefix(7))
    }

    static func monthLabel(for date: Date, offset: Int = 0) -> String {
        let calendar = Calendar.current
        let shifted = calendar.date(byAdding: .month, value: offset, to: date) ?? date
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: shifted)
    }

    static func monthBounds(for date: Date, offset: Int = 0) -> (start: String, end: String, label: String) {
        let calendar = Calendar.current
        let shifted = calendar.date(byAdding: .month, value: offset, to: date) ?? date
        let components = calendar.dateComponents([.year, .month], from: shifted)
        let start = calendar.date(from: components) ?? shifted
        let end = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: start) ?? shifted
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return (
            normalizeDate(start),
            normalizeDate(end),
            formatter.string(from: shifted)
        )
    }

    static func dateFromString(_ value: String) -> Date? {
        let formatter = DateFormatter()
        formatter.calendar = Calendar.current
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: String(value.prefix(10)))
    }

    static func todayString() -> String {
        normalizeDate(Date())
    }

    static func displayString(from value: String) -> String {
        guard let date = dateFromString(value) else { return value }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MM/dd/yyyy"
        return formatter.string(from: date)
    }
}

private extension DateFormatter {
    static let localizedFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()
}

enum RecurrenceService {
    static func generateTransactions(
        base: TransactionDTO,
        frequency: RecurrenceFrequency,
        count: Int
    ) -> [TransactionDTO] {
        let safeCount = max(1, min(PulseConstants.maxRecurrenceCount, count))
        return (0..<safeCount).map { index in
            TransactionDTO(
                id: index == 0 ? base.id : UUID().uuidString,
                date: PulseDateUtils.shiftDateByFrequency(base.date, frequency: frequency, occurrenceIndex: index),
                description: base.description,
                parentCategory: base.parentCategory,
                tripID: base.tripID,
                category: base.category,
                type: base.type,
                amount: base.amount,
                createdAt: base.createdAt
            )
        }
    }
}

enum ClassificationService {
    static func suggestCategory(from description: String, type: TransactionType, model: CategoryModelPayload) -> CategoryAssignment {
        let lower = description.lowercased()
        let groups = type == .income ? model.income : model.expense

        for group in groups {
            for subcategory in group.subcategories {
                if subcategory.keywords.contains(where: { lower.contains($0.lowercased()) }) {
                    return CategoryAssignment(parentCategory: group.name, category: subcategory.name)
                }
            }
        }

        return type == .income
            ? CategoryAssignment(parentCategory: "Income", category: "Salary")
            : CategoryAssignment(parentCategory: "Personal", category: "Food")
    }

    static func normalizeCategory(
        value: String?,
        parentCategory: String?,
        type: TransactionType,
        description: String,
        model: CategoryModelPayload
    ) -> CategoryAssignment {
        let rawCategory = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let rawParent = parentCategory?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let normalizedParent = rawParent.lowercased() == "personal expenses" ? "Personal" : rawParent
        let groups = type == .income ? model.income : model.expense

        if !rawCategory.isEmpty, let alias = DefaultCategoryModel.legacyAliases[rawCategory.uppercased()] {
            return alias
        }

        if !rawCategory.isEmpty {
            for group in groups {
                if let match = group.subcategories.first(where: { $0.name.caseInsensitiveCompare(rawCategory) == .orderedSame }) {
                    return CategoryAssignment(parentCategory: group.name, category: match.name)
                }
            }
        }

        if !rawCategory.isEmpty, !normalizedParent.isEmpty,
           let parentMatch = groups.first(where: { $0.name.caseInsensitiveCompare(normalizedParent) == .orderedSame }),
           let sub = parentMatch.subcategories.first(where: { $0.name.caseInsensitiveCompare(rawCategory) == .orderedSame }) {
            return CategoryAssignment(parentCategory: parentMatch.name, category: sub.name)
        }

        if !rawCategory.isEmpty, !rawParent.isEmpty {
            return CategoryAssignment(parentCategory: normalizedParent.isEmpty ? rawParent : normalizedParent, category: rawCategory)
        }

        return suggestCategory(from: description, type: type, model: model)
    }

    static func parentCategories(for type: TransactionType, model: CategoryModelPayload) -> [String] {
        let groups = type == .income ? model.income : model.expense
        return groups.map(\.name)
    }

    static func subcategories(for type: TransactionType, parent: String, model: CategoryModelPayload) -> [String] {
        let groups = type == .income ? model.income : model.expense
        return groups.first(where: { $0.name == parent })?.subcategories.map(\.name) ?? []
    }
}

enum DuplicateKeyBuilder {
    static func build(date: String, description: String, type: TransactionType, amount: Double) -> String {
        let normalizedAmount = String(format: "%.2f", amount)
        return "\(date)|\(description.lowercased())|\(type.rawValue)|\(normalizedAmount)"
    }
}

enum AnalyticsService {
    static func monthlyMetrics(for transactions: [TransactionDTO], monthStart: String, monthEnd: String) -> MonthlyMetrics {
        let filtered = transactions.filter { $0.date >= monthStart && $0.date <= monthEnd }
        let income = filtered.filter { $0.type == .income }.reduce(0) { $0 + $1.amount }
        let spending = filtered.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount }
        let net = income - spending
        let savingsRate = income > 0 ? net / income : 0
        return MonthlyMetrics(income: income, spending: spending, net: net, savingsRate: savingsRate)
    }

    static func yearlyMetrics(for transactions: [TransactionDTO], year: Int, monthEnd _: String) -> YearlyMetrics {
        let yearPrefix = String(year)
        let filtered = transactions.filter { $0.date.hasPrefix(yearPrefix) }
        let income = filtered.filter { $0.type == .income }.reduce(0) { $0 + $1.amount }
        let spending = filtered.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount }
        let net = income - spending
        let savingsRate = income > 0 ? net / income : 0
        return YearlyMetrics(income: income, spending: spending, net: net, savingsRate: savingsRate)
    }

    static func parentTotals(for transactions: [TransactionDTO], monthStart: String, monthEnd: String) -> [ParentTotal] {
        var totals: [String: Double] = [:]
        for transaction in transactions where transaction.date >= monthStart && transaction.date <= monthEnd {
            totals[transaction.parentCategory, default: 0] += transaction.amount
        }
        return totals.map { ParentTotal(id: $0.key, parentCategory: $0.key, amount: $0.value) }
            .sorted { $0.amount > $1.amount }
    }

    static func chartSlices(for transactions: [TransactionDTO], monthStart: String, monthEnd: String) -> [ChartSlice] {
        let expenses = transactions.filter { $0.date >= monthStart && $0.date <= monthEnd && $0.type == .expense }
        let parentTotals = Dictionary(grouping: expenses, by: \.parentCategory)
            .mapValues { $0.reduce(0) { $0 + $1.amount } }
        return parentTotals.map { parent, amount in
            let subTotals = Dictionary(grouping: expenses.filter { $0.parentCategory == parent }, by: \.category)
                .mapValues { $0.reduce(0) { $0 + $1.amount } }
            let breakdown = subTotals.map { name, subAmount in
                SubcategoryBreakdown(
                    name: name,
                    amount: subAmount,
                    percentage: amount > 0 ? (subAmount / amount) * 100 : 0
                )
            }.sorted { $0.amount > $1.amount }

            return ChartSlice(
                id: parent,
                parentCategory: parent,
                amount: amount,
                colorHex: PulseTheme.categoryHex(for: parent),
                subcategoryBreakdown: breakdown
            )
        }.sorted { $0.amount > $1.amount }
    }

    static func savingsMetrics(for transactions: [TransactionDTO], goal: SavingsGoalDTO) -> SavingsMetrics {
        var totalIncome = 0.0
        var totalSpending = 0.0
        var monthTotals: [String: (income: Double, spending: Double)] = [:]

        for transaction in transactions {
            if transaction.type == .income {
                totalIncome += transaction.amount
            } else {
                totalSpending += transaction.amount
            }

            let key = PulseDateUtils.monthKey(for: transaction.date)
            var bucket = monthTotals[key, default: (0, 0)]
            if transaction.type == .income {
                bucket.income += transaction.amount
            } else {
                bucket.spending += transaction.amount
            }
            monthTotals[key] = bucket
        }

        let monthsTracked = monthTotals.count
        let currentSaved = totalIncome - totalSpending
        let avgMonthlyIncome = monthsTracked > 0 ? totalIncome / Double(monthsTracked) : 0
        let avgMonthlySpending = monthsTracked > 0 ? totalSpending / Double(monthsTracked) : 0
        let avgMonthlyNet = monthsTracked > 0 ? currentSaved / Double(monthsTracked) : 0
        let spendingRatio = totalIncome > 0 ? totalSpending / totalIncome : 0

        let target = goal.targetAmount
        let bufferMonths = max(0, min(24, goal.bufferMonths))
        let comfortBuffer = avgMonthlySpending * Double(bufferMonths)
        let comfortableSaved = max(0, currentSaved - comfortBuffer)
        let requiredComfortTotal = target > 0 ? target + comfortBuffer : 0
        let progressRaw = target > 0 ? (comfortableSaved / target) * 100 : 0
        let progress = max(0, min(100, progressRaw))
        let remaining = target > 0 ? max(0, target - comfortableSaved) : 0
        let monthsToGoal: Int? = target > 0 && avgMonthlyNet > 0
            ? Int(ceil(max(0, requiredComfortTotal - currentSaved) / avgMonthlyNet))
            : nil

        return SavingsMetrics(
            totalIncome: totalIncome,
            totalSpending: totalSpending,
            currentSaved: currentSaved,
            avgMonthlyIncome: avgMonthlyIncome,
            avgMonthlySpending: avgMonthlySpending,
            avgMonthlyNet: avgMonthlyNet,
            spendingRatio: spendingRatio,
            monthsTracked: monthsTracked,
            target: target,
            bufferMonths: bufferMonths,
            comfortBuffer: comfortBuffer,
            comfortableSaved: comfortableSaved,
            requiredComfortTotal: requiredComfortTotal,
            progress: progress,
            remaining: remaining,
            monthsToGoal: monthsToGoal
        )
    }

    static func filterTransactions(
        _ transactions: [TransactionDTO],
        filters: MonthLogFilters,
        monthStart: String,
        monthEnd: String
    ) -> [TransactionDTO] {
        var results = transactions.filter { $0.date >= monthStart && $0.date <= monthEnd }

        if filters.type != "all" {
            results = results.filter { $0.type.rawValue == filters.type }
        }
        if filters.parent != "all" {
            results = results.filter { $0.parentCategory == filters.parent }
        }
        if filters.subcategory != "all" {
            results = results.filter { $0.category == filters.subcategory }
        }
        if !filters.query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let query = filters.query.lowercased()
            results = results.filter {
                $0.description.lowercased().contains(query)
                    || $0.category.lowercased().contains(query)
                    || $0.parentCategory.lowercased().contains(query)
            }
        }

        return sortTransactions(results, by: filters.sortBy)
    }

    static func searchTransactions(_ transactions: [TransactionDTO], query: String, sort: TransactionSort) -> [TransactionDTO] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }

        let lower = trimmed.lowercased()
        let results = transactions.filter {
            $0.description.lowercased().contains(lower)
                || $0.category.lowercased().contains(lower)
                || $0.parentCategory.lowercased().contains(lower)
                || $0.date.contains(trimmed)
        }
        return sortTransactions(results, by: sort)
    }

    static func sortTransactions(_ transactions: [TransactionDTO], by sort: TransactionSort) -> [TransactionDTO] {
        switch sort {
        case .dateDesc:
            return transactions.sorted { $0.date == $1.date ? $0.createdAt > $1.createdAt : $0.date > $1.date }
        case .dateAsc:
            return transactions.sorted { $0.date == $1.date ? $0.createdAt < $1.createdAt : $0.date < $1.date }
        case .amountDesc:
            return transactions.sorted { $0.amount == $1.amount ? $0.date > $1.date : $0.amount > $1.amount }
        case .amountAsc:
            return transactions.sorted { $0.amount == $1.amount ? $0.date < $1.date : $0.amount < $1.amount }
        case .descriptionAsc:
            return transactions.sorted { $0.description.localizedCaseInsensitiveCompare($1.description) == .orderedAscending }
        case .descriptionDesc:
            return transactions.sorted { $0.description.localizedCaseInsensitiveCompare($1.description) == .orderedDescending }
        }
    }
}
