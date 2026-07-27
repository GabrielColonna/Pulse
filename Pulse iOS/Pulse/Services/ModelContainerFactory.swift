import Foundation
import SwiftData

enum ModelContainerFactory {
    static func makeContainer(isStoredInMemoryOnly: Bool = false) throws -> ModelContainer {
        let schema = Schema([
            TransactionRecord.self,
            TripRecord.self,
            CategoryModelRecord.self,
            SavingsGoalRecord.self,
            AppPreferenceRecord.self
        ])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: isStoredInMemoryOnly)
        return try ModelContainer(for: schema, configurations: [configuration])
    }

    static func makePersistentContainer() -> ModelContainer {
        do {
            return try makeContainer()
        } catch {
            assertionFailure("Persistent ModelContainer failed: \(error.localizedDescription)")
            do {
                return try makeContainer(isStoredInMemoryOnly: true)
            } catch {
                fatalError("Could not create fallback in-memory ModelContainer: \(error)")
            }
        }
    }
}
