import SwiftData
import SwiftUI

struct RootView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.scenePhase) private var scenePhase
    @State private var store = PulseStore()

    var body: some View {
        ZStack {
            PulseBackground()

            if store.isInitializing {
                ProgressView("Loading Pulse...")
                    .font(PulseFont.body(15))
                    .foregroundStyle(PulseTheme.textMain)
            } else if store.isUnlocked {
                DashboardView(store: store)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            } else {
                PrivacyGateView(store: store)
            }
        }
        .onAppear {
            store.configure(context: modelContext)
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .background, PulseConstants.privacyGateEnabled, !ProcessInfo.processInfo.arguments.contains("-uiTesting") {
                store.lockPrivacyGate()
            }
        }
        .sheet(item: Binding(
            get: { store.activeSheet },
            set: { store.activeSheet = $0 }
        )) { sheet in
            switch sheet {
            case .quickAdd:
                QuickAddView(store: store)
            case .monthLog:
                MonthLogView(store: store)
            case .globalSearch:
                GlobalSearchView(store: store)
            case .tripSummary:
                TripSummaryView(store: store)
            case .manageTrips:
                ManageTripsView(store: store)
            case .importPreview:
                ImportPreviewView(store: store)
            case .settings:
                SettingsView(store: store)
            case .savings:
                SavingsView(store: store)
            }
        }
        .sheet(item: Binding(
            get: { store.activeDialog },
            set: { store.activeDialog = $0 }
        )) { dialog in
            AppDialogView(store: store, dialog: dialog)
                .presentationDetents([.height(260)])
        }
    }
}

struct PrivacyGateView: View {
    @Bindable var store: PulseStore
    @FocusState private var focusedIndex: Int?
    @State private var digits = Array(repeating: "", count: 4)

    var body: some View {
        VStack(spacing: 16) {
            Image("PulseLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 72, height: 72)
                .shadow(color: PulseTheme.purple.opacity(0.35), radius: 8)

            Text("Pulse")
                .font(PulseFont.heading(34))
                .foregroundStyle(PulseTheme.textMain)

            Text("Enter PIN To Open Your Dashboard.")
                .font(PulseFont.body(15))
                .foregroundStyle(PulseTheme.textMuted)
                .multilineTextAlignment(.center)

            HStack(spacing: 10) {
                ForEach(0..<4, id: \.self) { index in
                    SecureField("", text: $digits[index])
                        .accessibilityIdentifier("pinDigit\(index)")
                        .focused($focusedIndex, equals: index)
                        .keyboardType(.numberPad)
                        .textContentType(.oneTimeCode)
                        .multilineTextAlignment(.center)
                        .font(PulseFont.body(22, weight: .bold))
                        .frame(height: 52)
                        .background(Color(hex: "#120F22"), in: RoundedRectangle(cornerRadius: 12))
                        .overlay {
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(store.privacySuccess ? PulseTheme.green.opacity(0.68) : Color(hex: "#43386D"), lineWidth: 1)
                        }
                        .onChange(of: digits[index]) { _, newValue in
                            handleDigitChange(index: index, value: newValue)
                        }
                }
            }

            Button("Unlock") {
                store.unlock(with: digits.joined())
            }
            .accessibilityIdentifier("unlockButton")
            .buttonStyle(PrimaryButtonStyle())
            .frame(maxWidth: .infinity)

            if !store.privacyError.isEmpty {
                Text(store.privacyError)
                    .font(PulseFont.body(13, weight: .medium))
                    .foregroundStyle(store.privacySuccess ? Color(hex: "#86FFB8") : PulseTheme.red)
            }
        }
        .padding(20)
        .frame(maxWidth: 420)
        .background(
            store.privacySuccess ? Color(hex: "#081C11").opacity(0.95) : Color(hex: "#0F0D1C").opacity(0.96),
            in: RoundedRectangle(cornerRadius: 16)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(store.privacySuccess ? PulseTheme.green.opacity(0.65) : Color(hex: "#41366F"), lineWidth: 1)
        }
        .padding()
        .onAppear {
            focusedIndex = 0
        }
    }

    private func handleDigitChange(index: Int, value: String) {
        let filtered = value.filter(\.isNumber)
        if filtered.count > 1 {
            applyPastedDigits(startingAt: index, value: filtered)
            return
        }

        digits[index] = String(filtered.prefix(1))
        if !digits[index].isEmpty, index < 3 {
            focusedIndex = index + 1
        }

        let pin = digits.joined()
        if pin.count == 4 {
            store.unlock(with: pin)
        } else if store.privacyError.contains("Incorrect") {
            store.privacyError = ""
        }
    }

    private func applyPastedDigits(startingAt index: Int, value: String) {
        let characters = Array(value.prefix(4 - index))
        for (offset, character) in characters.enumerated() {
            digits[index + offset] = String(character)
        }
        focusedIndex = min(index + characters.count, 3)
        store.unlock(with: digits.joined())
    }
}

#if DEBUG
#Preview("Root App") {
    RootView()
        .modelContainer(PreviewSupport.modelContainer)
        .preferredColorScheme(.dark)
}
#endif
