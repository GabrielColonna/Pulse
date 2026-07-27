import Foundation
import SwiftData

enum TransactionType: String, Codable, CaseIterable, Identifiable {
    case income
    case expense

    var id: String { rawValue }

    var label: String {
        rawValue.capitalized
    }
}

enum RecurrenceFrequency: String, CaseIterable, Identifiable {
    case none
    case weekly
    case biweekly
    case monthly

    var id: String { rawValue }

    var label: String {
        switch self {
        case .none: "One Time"
        case .weekly: "Weekly"
        case .biweekly: "Biweekly"
        case .monthly: "Monthly"
        }
    }
}

@Model
final class TransactionRecord {
    @Attribute(.unique) var id: String
    var date: String
    var transactionDescription: String
    var parentCategory: String
    var tripID: String?
    var category: String
    var typeRaw: String
    var amount: Double
    var createdAt: Date

    init(
        id: String = UUID().uuidString,
        date: String,
        transactionDescription: String,
        parentCategory: String,
        tripID: String? = nil,
        category: String,
        type: TransactionType,
        amount: Double,
        createdAt: Date = .now
    ) {
        self.id = id
        self.date = date
        self.transactionDescription = transactionDescription
        self.parentCategory = parentCategory
        self.tripID = tripID
        self.category = category
        self.typeRaw = type.rawValue
        self.amount = amount
        self.createdAt = createdAt
    }

    var type: TransactionType {
        get { TransactionType(rawValue: typeRaw) ?? .expense }
        set { typeRaw = newValue.rawValue }
    }
}

@Model
final class TripRecord {
    @Attribute(.unique) var id: String
    var name: String
    var startDate: String
    var endDate: String
    var createdAt: Date
    var archived: Bool

    init(
        id: String = UUID().uuidString,
        name: String,
        startDate: String = "",
        endDate: String = "",
        createdAt: Date = .now,
        archived: Bool = false
    ) {
        self.id = id
        self.name = name
        self.startDate = startDate
        self.endDate = endDate
        self.createdAt = createdAt
        self.archived = archived
    }
}

@Model
final class CategoryModelRecord {
    @Attribute(.unique) var id: String
    var payloadJSON: Data
    var updatedAt: Date

    init(id: String = "default", payloadJSON: Data, updatedAt: Date = .now) {
        self.id = id
        self.payloadJSON = payloadJSON
        self.updatedAt = updatedAt
    }
}

@Model
final class SavingsGoalRecord {
    @Attribute(.unique) var id: String
    var name: String
    var targetAmount: Double
    var bufferMonths: Int
    var updatedAt: Date

    init(
        id: String = "default",
        name: String = "",
        targetAmount: Double = 0,
        bufferMonths: Int = 2,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.name = name
        self.targetAmount = targetAmount
        self.bufferMonths = bufferMonths
        self.updatedAt = updatedAt
    }
}

@Model
final class AppPreferenceRecord {
    @Attribute(.unique) var id: String
    var privacyUnlocked: Bool

    init(id: String = "default", privacyUnlocked: Bool = false) {
        self.id = id
        self.privacyUnlocked = privacyUnlocked
    }
}

struct TransactionDTO: Identifiable, Hashable {
    let id: String
    var date: String
    var description: String
    var parentCategory: String
    var tripID: String?
    var category: String
    var type: TransactionType
    var amount: Double
    var createdAt: Date

    init(from record: TransactionRecord) {
        id = record.id
        date = record.date
        description = record.transactionDescription
        parentCategory = record.parentCategory
        tripID = record.tripID
        category = record.category
        type = record.type
        amount = record.amount
        createdAt = record.createdAt
    }

    init(
        id: String = UUID().uuidString,
        date: String,
        description: String,
        parentCategory: String,
        tripID: String? = nil,
        category: String,
        type: TransactionType,
        amount: Double,
        createdAt: Date = .now
    ) {
        self.id = id
        self.date = date
        self.description = description
        self.parentCategory = parentCategory
        self.tripID = tripID
        self.category = category
        self.type = type
        self.amount = amount
        self.createdAt = createdAt
    }
}

struct TripDTO: Identifiable, Hashable {
    let id: String
    var name: String
    var startDate: String
    var endDate: String
    var createdAt: Date
    var archived: Bool

    init(from record: TripRecord) {
        id = record.id
        name = record.name
        startDate = record.startDate
        endDate = record.endDate
        createdAt = record.createdAt
        archived = record.archived
    }

    init(
        id: String = UUID().uuidString,
        name: String,
        startDate: String = "",
        endDate: String = "",
        createdAt: Date = .now,
        archived: Bool = false
    ) {
        self.id = id
        self.name = name
        self.startDate = startDate
        self.endDate = endDate
        self.createdAt = createdAt
        self.archived = archived
    }
}

struct SavingsGoalDTO: Equatable {
    var name: String
    var targetAmount: Double
    var bufferMonths: Int

    static let empty = SavingsGoalDTO(name: "", targetAmount: 0, bufferMonths: 2)

    init(from record: SavingsGoalRecord) {
        name = record.name
        targetAmount = record.targetAmount
        bufferMonths = record.bufferMonths
    }

    init(name: String = "", targetAmount: Double = 0, bufferMonths: Int = 2) {
        self.name = name
        self.targetAmount = targetAmount
        self.bufferMonths = bufferMonths
    }
}

struct SavingsMetrics: Equatable {
    let totalIncome: Double
    let totalSpending: Double
    let currentSaved: Double
    let avgMonthlyIncome: Double
    let avgMonthlySpending: Double
    let avgMonthlyNet: Double
    let spendingRatio: Double
    let monthsTracked: Int
    let target: Double
    let bufferMonths: Int
    let comfortBuffer: Double
    let comfortableSaved: Double
    let requiredComfortTotal: Double
    let progress: Double
    let remaining: Double
    let monthsToGoal: Int?
}

struct CategoryAssignment: Equatable {
    let parentCategory: String
    let category: String
}

struct CategorySubcategory: Codable, Hashable, Identifiable {
    var id: String { name }
    var name: String
    var keywords: [String]
}

struct CategoryGroup: Codable, Hashable, Identifiable {
    var id: String { name }
    var name: String
    var subcategories: [CategorySubcategory]
}

struct CategoryModelPayload: Codable, Equatable {
    var income: [CategoryGroup]
    var expense: [CategoryGroup]
}

struct ImportPreviewRow: Identifiable, Hashable {
    let id: String
    var rowIndex: Int
    var date: String
    var description: String
    var amount: Double
    var type: TransactionType
    var parentCategory: String
    var category: String
    var tripName: String
    var status: ImportRowStatus
    var isEdited: Bool
}

enum ImportRowStatus: String, Hashable {
    case ready
    case invalid
    case duplicate
    case duplicateFile
}

struct ImportPreviewState: Identifiable {
    let id = UUID()
    var headers: [String]
    var mapping: ImportColumnMapping
    var sourceRows: [[String: String]]
    var rows: [ImportPreviewRow]
    var skipDuplicates: Bool
}

struct ImportColumnMapping: Equatable {
    var date: String
    var description: String
    var amount: String
    var type: String
    var parentCategory: String
    var category: String
    var trip: String
}

struct MonthLogFilters: Equatable {
    var query: String = ""
    var type: String = "all"
    var parent: String = "all"
    var subcategory: String = "all"
    var sortBy: TransactionSort = .dateDesc
}

enum TransactionSort: String, CaseIterable, Identifiable {
    case dateDesc
    case dateAsc
    case amountDesc
    case amountAsc
    case descriptionAsc
    case descriptionDesc

    var id: String { rawValue }

    var label: String {
        switch self {
        case .dateDesc: "Date (Newest)"
        case .dateAsc: "Date (Oldest)"
        case .amountDesc: "Amount (High)"
        case .amountAsc: "Amount (Low)"
        case .descriptionAsc: "Description (A-Z)"
        case .descriptionDesc: "Description (Z-A)"
        }
    }
}

struct ParentTotal: Identifiable, Hashable {
    let id: String
    let parentCategory: String
    let amount: Double
}

struct SubcategoryBreakdown: Identifiable, Hashable {
    let name: String
    let amount: Double
    let percentage: Double

    var id: String { name }
}

struct ChartSlice: Identifiable, Hashable {
    let id: String
    let parentCategory: String
    let amount: Double
    let colorHex: String
    let subcategoryBreakdown: [SubcategoryBreakdown]
}

struct AppDialogRequest: Identifiable, Equatable {
    enum Mode: Equatable {
        case confirm
        case prompt(defaultValue: String)
    }

    let id = UUID()
    let title: String
    let message: String
    let confirmTitle: String
    let cancelTitle: String
    let isDestructive: Bool
    let mode: Mode
}

struct MonthlyMetrics: Equatable {
    let income: Double
    let spending: Double
    let net: Double
    let savingsRate: Double
}

struct YearlyMetrics: Equatable {
    let income: Double
    let spending: Double
    let net: Double
    let savingsRate: Double
}
