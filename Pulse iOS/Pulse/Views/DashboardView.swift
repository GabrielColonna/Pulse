import Charts
import SwiftUI
import UniformTypeIdentifiers

struct DashboardView: View {
    @Bindable var store: PulseStore
    @State private var showingImporter = false
    @State private var exportItem: ExportDocument?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if !store.statusMessage.isEmpty {
                        PulseStatusBanner(message: store.statusMessage, isError: store.statusIsError)
                    }

                    yearSection
                    monthSection
                    chartSection
                    parentTotalsSection
                    recentEntriesSection
                }
                .padding(.horizontal)
                .padding(.bottom, 100)
            }
            .safeAreaInset(edge: .bottom) {
                quickAddBar
            }
            .navigationTitle("")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: 10) {
                        Image("PulseLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 36, height: 36)
                        Text("Pulse")
                            .font(PulseFont.heading(28))
                            .foregroundStyle(PulseTheme.textMain)
                    }
                }

                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        store.activeSheet = .globalSearch
                    } label: {
                        Image(systemName: "magnifyingglass")
                    }

                    Menu("User") {
                        Button("User Profile") {
                            store.setStatus("User Profile Is Coming Soon...")
                        }
                        Button("Settings") {
                            store.activeSheet = .settings
                        }
                    }

                    Button("Savings") {
                        store.activeSheet = .savings
                    }
                    .accessibilityIdentifier("savingsButton")

                    Menu("Trips") {
                        Button("Create Trip") {
                            store.presentPrompt(title: "Create Trip", message: "Enter a trip name.") { name in
                                store.createTrip(named: name)
                            }
                        }
                        Button("Trip Summary") {
                            store.activeSheet = .tripSummary
                        }
                        Button("Manage Trips") {
                            store.activeSheet = .manageTrips
                        }
                    }
                    .accessibilityIdentifier("tripsMenu")

                    Menu("Data") {
                        Button("Import Data") { showingImporter = true }
                        Button("Export Data") {
                            guard !store.transactions.isEmpty else {
                                store.setStatus("No Data To Export Yet.", isError: true)
                                return
                            }
                            do {
                                exportItem = ExportDocument(
                                    data: try store.exportWorkbookData(),
                                    filename: "budget-pulse-export.xlsx"
                                )
                            } catch {
                                store.setStatus(error.localizedDescription, isError: true)
                            }
                        }
                        Button("Backup Data") {
                            guard !store.transactions.isEmpty else {
                                store.setStatus("No Data To Backup Yet.", isError: true)
                                return
                            }
                            exportItem = ExportDocument(data: store.exportBackupData(), filename: "budget-pulse-backup.csv")
                        }
                    }
                    .accessibilityIdentifier("dataMenu")

                    Menu("Danger") {
                        Button("Clear Data", role: .destructive) {
                            store.presentConfirm(
                                title: "Clear All Data?",
                                message: "This permanently deletes every transaction.",
                                destructive: true,
                                confirmTitle: "Clear"
                            ) {
                                store.clearAllTransactions()
                            }
                        }
                    }
                    .accessibilityIdentifier("dangerMenu")
                }
            }
        }
        .fileImporter(
            isPresented: $showingImporter,
            allowedContentTypes: [.commaSeparatedText, .spreadsheet, .data],
            allowsMultipleSelection: false
        ) { result in
            if case .success(let urls) = result, let url = urls.first {
                store.prepareImportPreview(from: url)
            }
        }
        .sheet(item: $exportItem) { item in
            ShareSheet(items: [item.url])
        }
    }

    private var quickAddBar: some View {
        Button {
            store.cancelEditing()
            store.activeSheet = .quickAdd
        } label: {
            HStack {
                Image(systemName: "plus.circle.fill")
                Text("Quick Add")
                    .font(PulseFont.body(16, weight: .bold))
                Spacer()
                Image(systemName: "chevron.up")
            }
            .foregroundStyle(.black)
            .padding()
            .background(PulseTheme.primaryGradient, in: RoundedRectangle(cornerRadius: 18))
            .padding(.horizontal)
            .padding(.bottom, 8)
        }
        .accessibilityIdentifier("quickAddButton")
    }

    private var yearSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeading(title: "Yearly Summary")
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                MetricCard(title: "Year Income", value: store.yearlyMetrics.income.currencyString, valueColor: PulseTheme.green)
                MetricCard(title: "Year Spending", value: store.yearlyMetrics.spending.currencyString, valueColor: Color(hex: "#FF4F7D"))
                MetricCard(title: "Year Net", value: store.yearlyMetrics.net.currencyString, valueColor: store.yearlyMetrics.net >= 0 ? PulseTheme.green : PulseTheme.red)
                MetricCard(title: "Year Savings Rate", value: store.yearlyMetrics.savingsRate.percentString)
            }
        }
    }

    private var monthSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeading(title: "Monthly Summary")
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                MetricCard(title: "Income This Month", value: store.monthlyMetrics.income.currencyString, valueColor: PulseTheme.green)
                MetricCard(title: "Spending This Month", value: store.monthlyMetrics.spending.currencyString, valueColor: Color(hex: "#FF4F7D"))
                MetricCard(title: "Net This Month", value: store.monthlyMetrics.net.currencyString, valueColor: store.monthlyMetrics.net >= 0 ? PulseTheme.green : PulseTheme.red)
                MetricCard(title: "Savings Rate", value: store.monthlyMetrics.savingsRate.percentString)
            }
        }
    }

    private var chartSection: some View {
        VStack(spacing: 12) {
            PulseCard {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Category Chart")
                                .font(PulseFont.heading(20))
                            Text("Subcategory Totals Below")
                                .font(PulseFont.body(13))
                                .foregroundStyle(PulseTheme.textMuted)
                        }
                        Spacer()
                    }

                    if store.chartSlices.isEmpty {
                        EmptyStateView(message: "No Expense Categories For This Month.")
                    } else {
                        Chart(store.chartSlices) { slice in
                            SectorMark(
                                angle: .value("Amount", slice.amount),
                                innerRadius: .ratio(0.58),
                                angularInset: 1.5
                            )
                            .foregroundStyle(Color(hex: slice.colorHex))
                        }
                        .frame(height: 220)

                        ForEach(store.chartSlices) { slice in
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Circle().fill(Color(hex: slice.colorHex)).frame(width: 10, height: 10)
                                    Text(slice.parentCategory)
                                        .font(PulseFont.body(14, weight: .bold))
                                    Spacer()
                                    Text(slice.amount.currencyString)
                                }
                                ForEach(slice.subcategoryBreakdown, id: \.name) { item in
                                    HStack {
                                        Text(item.name)
                                            .font(PulseFont.body(12))
                                            .foregroundStyle(PulseTheme.textMuted)
                                        Spacer()
                                        Text("\(Int(item.percentage.rounded()))% • \(item.amount.currencyString)")
                                            .font(PulseFont.body(12))
                                            .foregroundStyle(PulseTheme.textMuted)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            PulseCard {
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Button {
                            store.monthOffset -= 1
                        } label: {
                            Image(systemName: "chevron.left")
                        }
                        .buttonStyle(GhostButtonStyle())

                        Spacer()

                        Text(store.currentMonthBounds.label)
                            .font(PulseFont.heading(20))

                        Spacer()

                        Button {
                            store.monthOffset += 1
                        } label: {
                            Image(systemName: "chevron.right")
                        }
                        .buttonStyle(GhostButtonStyle())
                    }

                    HStack {
                        VStack(alignment: .leading) {
                            Text("Spending")
                                .foregroundStyle(PulseTheme.textMuted)
                            Text(store.monthlyMetrics.spending.currencyString)
                                .foregroundStyle(Color(hex: "#FF4F7D"))
                                .font(PulseFont.heading(24))
                        }
                        Spacer()
                        VStack(alignment: .trailing) {
                            Text("Net")
                                .foregroundStyle(PulseTheme.textMuted)
                            Text(store.monthlyMetrics.net.currencyString)
                                .foregroundStyle(store.monthlyMetrics.net >= 0 ? PulseTheme.green : PulseTheme.red)
                                .font(PulseFont.heading(24))
                        }
                    }

                    Button("Open Monthly Log") {
                        store.activeSheet = .monthLog
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }

    private var parentTotalsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeading(title: "Category Cards")
            if store.parentTotals.isEmpty {
                EmptyStateView(message: "No Parent Category Totals For This Month.")
            } else {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(store.parentTotals) { total in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(total.parentCategory)
                                .font(PulseFont.body(13, weight: .bold))
                                .foregroundStyle(PulseTheme.categoryColor(for: total.parentCategory))
                            Text(total.amount.currencyString)
                                .font(PulseFont.heading(22))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .background(PulseTheme.categoryColor(for: total.parentCategory).opacity(0.08), in: RoundedRectangle(cornerRadius: PulseTheme.radius))
                        .overlay {
                            RoundedRectangle(cornerRadius: PulseTheme.radius)
                                .stroke(PulseTheme.categoryColor(for: total.parentCategory).opacity(0.35), lineWidth: 1)
                        }
                    }
                }
            }
        }
    }

    private var recentEntriesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeading(title: "Recent Entries")
            if store.recentTransactions.isEmpty {
                EmptyStateView(message: "No Transactions Yet.")
            } else {
                ForEach(store.recentTransactions) { transaction in
                    TransactionRow(
                        transaction: transaction,
                        tripName: store.tripName(for: transaction.tripID),
                        onEdit: { store.beginEditing(transaction) },
                        onDelete: {
                            store.presentConfirm(
                                title: "Delete Transaction?",
                                message: transaction.description,
                                destructive: true,
                                confirmTitle: "Delete"
                            ) {
                                store.deleteTransaction(transaction)
                            }
                        }
                    )
                }
            }
        }
    }
}

struct TransactionRow: View {
    let transaction: TransactionDTO
    let tripName: String
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        PulseCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(transaction.description)
                            .font(PulseFont.body(15, weight: .bold))
                        Text(PulseDateUtils.displayString(from: transaction.date))
                            .font(PulseFont.body(12))
                            .foregroundStyle(PulseTheme.textMuted)
                    }
                    Spacer()
                    Text((transaction.type == .income ? transaction.amount : -transaction.amount).currencyString)
                        .font(PulseFont.body(16, weight: .bold))
                        .foregroundStyle(transaction.type == .income ? PulseTheme.green : Color(hex: "#FF4F7D"))
                }

                HStack(spacing: 8) {
                    TypeChip(type: transaction.type)
                    CategoryChip(parentCategory: transaction.parentCategory)
                    Text(transaction.category)
                        .font(PulseFont.body(12))
                        .foregroundStyle(PulseTheme.textMuted)
                    if !tripName.isEmpty {
                        Text(tripName)
                            .font(PulseFont.body(12))
                            .foregroundStyle(PulseTheme.blue)
                    }
                }

                HStack {
                    Button("Edit", action: onEdit)
                        .buttonStyle(GhostButtonStyle())
                    Button("Delete", action: onDelete)
                        .buttonStyle(DangerButtonStyle())
                }
            }
        }
    }
}

struct ExportDocument: Identifiable {
    let id = UUID()
    let data: Data
    let filename: String

    var url: URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        try? data.write(to: url)
        return url
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
