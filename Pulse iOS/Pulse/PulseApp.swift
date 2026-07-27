import SwiftData
import SwiftUI

@main
struct PulseApp: App {
    var sharedModelContainer: ModelContainer = ModelContainerFactory.makePersistentContainer()

    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark)
        }
        .modelContainer(sharedModelContainer)
    }
}
