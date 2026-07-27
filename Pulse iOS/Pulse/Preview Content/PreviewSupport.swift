import SwiftData
import SwiftUI

#if DEBUG
enum PreviewSupport {
    @MainActor
    static var modelContainer: ModelContainer = {
        let schema = Schema([
            TransactionRecord.self,
            TripRecord.self,
            CategoryModelRecord.self,
            SavingsGoalRecord.self,
            AppPreferenceRecord.self
        ])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)

        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Preview ModelContainer failed: \(error)")
        }
    }()

    @MainActor
    static func unlockedStore() -> PulseStore {
        let store = PulseStore()
        store.isInitializing = false
        store.isUnlocked = true
        store.transactions = sampleTransactions
        store.trips = sampleTrips
        store.savingsGoal = SavingsGoalDTO(name: "Emergency Fund", targetAmount: 5000, bufferMonths: 2)
        return store
    }

    @MainActor
    static func lockedStore() -> PulseStore {
        let store = PulseStore()
        store.isInitializing = false
        store.isUnlocked = false
        return store
    }

    @MainActor
    static func emptyStore() -> PulseStore {
        let store = PulseStore()
        store.isInitializing = false
        store.isUnlocked = true
        return store
    }

    @MainActor
    static func importStore() -> PulseStore {
        let store = unlockedStore()
        let rows = [
            ["Date": PulseDateUtils.todayString(), "Description": "Chipotle", "Amount": "14.50", "Type": "expense"],
            ["Date": PulseDateUtils.todayString(), "Description": "Chipotle", "Amount": "14.50", "Type": "expense"]
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
        store.importPreview = ImportService.buildPreview(
            rows: rows,
            mapping: mapping,
            existingTransactions: store.transactions,
            categoryModel: store.categoryModel
        )
        return store
    }

    static let sampleTransactions: [TransactionDTO] = [
        TransactionDTO(
            date: PulseDateUtils.todayString(),
            description: "Paycheck",
            parentCategory: "Income",
            category: "Salary",
            type: .income,
            amount: 3200
        ),
        TransactionDTO(
            date: PulseDateUtils.todayString(),
            description: "Chipotle",
            parentCategory: "Personal",
            category: "Food",
            type: .expense,
            amount: 14.50
        ),
        TransactionDTO(
            date: PulseDateUtils.todayString(),
            description: "Shell Gas",
            parentCategory: "Car",
            category: "Gas",
            type: .expense,
            amount: 48.20
        ),
        TransactionDTO(
            date: PulseDateUtils.todayString(),
            description: "Planet Fitness",
            parentCategory: "Expenses",
            category: "Memberships",
            type: .expense,
            amount: 24.99
        )
    ]

    static let sampleTrips: [TripDTO] = [
        TripDTO(name: "Miami Weekend"),
        TripDTO(name: "San Francisco")
    ]
}
#endif
