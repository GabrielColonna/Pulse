import SwiftUI

struct MonthLogView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: PulseStore

    private var parentOptions: [String] {
        Array(Set(store.transactions.map(\.parentCategory))).sorted()
    }

    private var subcategoryOptions: [String] {
        let matching = store.transactions.filter {
            store.monthLogFilters.parent == "all" || $0.parentCategory == store.monthLogFilters.parent
        }
        return Array(Set(matching.map(\.category))).sorted()
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                filterBar

                List {
                    ForEach(store.filteredMonthLogTransactions) { transaction in
                        HStack(spacing: 12) {
                            if store.monthLogDeleteMode {
                                Toggle("", isOn: Binding(
                                    get: { store.monthLogSelectedIDs.contains(transaction.id) },
                                    set: { isSelected in
                                        if isSelected {
                                            store.monthLogSelectedIDs.insert(transaction.id)
                                        } else {
                                            store.monthLogSelectedIDs.remove(transaction.id)
                                        }
                                    }
                                ))
                                .labelsHidden()
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                Text(transaction.description)
                                    .font(PulseFont.body(15, weight: .bold))
                                Text("\(PulseDateUtils.displayString(from: transaction.date)) • \(transaction.category)")
                                    .font(PulseFont.body(12))
                                    .foregroundStyle(PulseTheme.textMuted)
                            }

                            Spacer()

                            Text(transaction.amount.currencyString)
                                .foregroundStyle(transaction.type == .income ? PulseTheme.green : Color(hex: "#FF4F7D"))

                            if !store.monthLogDeleteMode {
                                Menu {
                                    Button("Edit") { store.beginEditing(transaction) }
                                    Button("Delete", role: .destructive) {
                                        store.presentConfirm(
                                            title: "Delete Transaction?",
                                            message: transaction.description,
                                            destructive: true,
                                            confirmTitle: "Delete"
                                        ) {
                                            store.deleteTransaction(transaction)
                                        }
                                    }
                                } label: {
                                    Image(systemName: "ellipsis.circle")
                                }
                            }
                        }
                        .listRowBackground(PulseTheme.surface)
                    }
                }
                .scrollContentBackground(.hidden)

                footerTotals
            }
            .background(PulseBackground())
            .navigationTitle("Monthly Log")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(store.monthLogDeleteMode ? "Done" : "Delete") {
                        store.monthLogDeleteMode.toggle()
                        if !store.monthLogDeleteMode {
                            store.monthLogSelectedIDs.removeAll()
                        }
                    }
                }
            }
            .safeAreaInset(edge: .bottom) {
                if store.monthLogDeleteMode {
                    HStack {
                        Button("Select All") {
                            store.monthLogSelectedIDs = Set(store.filteredMonthLogTransactions.map(\.id))
                        }
                        Button("Deselect All") {
                            store.monthLogSelectedIDs.removeAll()
                        }
                        Spacer()
                        Button("Delete Selected (\(store.monthLogSelectedIDs.count))") {
                            store.presentConfirm(
                                title: "Delete Selected?",
                                message: "Remove \(store.monthLogSelectedIDs.count) transactions.",
                                destructive: true,
                                confirmTitle: "Delete"
                            ) {
                                store.deleteSelectedMonthLogTransactions()
                            }
                        }
                        .disabled(store.monthLogSelectedIDs.isEmpty)
                    }
                    .font(PulseFont.body(13, weight: .medium))
                    .padding()
                    .background(PulseTheme.surfaceStrong)
                }
            }
        }
    }

    private var filterBar: some View {
        VStack(spacing: 10) {
            Text("Transactions For \(store.currentMonthBounds.label)")
                .font(PulseFont.body(13, weight: .medium))
                .foregroundStyle(PulseTheme.textMuted)
                .frame(maxWidth: .infinity, alignment: .leading)

            TextField("Search", text: $store.monthLogFilters.query)
                .textFieldStyle(PulseTextFieldStyle())

            HStack {
                Picker("Type", selection: $store.monthLogFilters.type) {
                    Text("All").tag("all")
                    Text("Income").tag("income")
                    Text("Expense").tag("expense")
                }
                .pickerStyle(.menu)

                Picker("Category", selection: $store.monthLogFilters.parent) {
                    Text("All Categories").tag("all")
                    ForEach(parentOptions, id: \.self) { parent in
                        Text(parent).tag(parent)
                    }
                }
                .pickerStyle(.menu)
                .onChange(of: store.monthLogFilters.parent) { _, _ in
                    store.monthLogFilters.subcategory = "all"
                }

                Picker("Subcategory", selection: $store.monthLogFilters.subcategory) {
                    Text("All Subcategories").tag("all")
                    ForEach(subcategoryOptions, id: \.self) { category in
                        Text(category).tag(category)
                    }
                }
                .pickerStyle(.menu)

                Picker("Sort", selection: $store.monthLogFilters.sortBy) {
                    ForEach(TransactionSort.allCases) { sort in
                        Text(sort.label).tag(sort)
                    }
                }
                .pickerStyle(.menu)

                Button("Reset") {
                    store.monthLogFilters = MonthLogFilters()
                }
                .buttonStyle(GhostButtonStyle())
            }
        }
        .padding()
    }

    private var footerTotals: some View {
        let income = store.filteredMonthLogTransactions.filter { $0.type == .income }.reduce(0) { $0 + $1.amount }
        let spending = store.filteredMonthLogTransactions.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount }
        let net = income - spending

        return HStack {
            VStack(alignment: .leading) {
                Text("Income").foregroundStyle(PulseTheme.textMuted)
                Text(income.currencyString).foregroundStyle(PulseTheme.green)
            }
            Spacer()
            VStack(alignment: .leading) {
                Text("Spending").foregroundStyle(PulseTheme.textMuted)
                Text(spending.currencyString).foregroundStyle(Color(hex: "#FF4F7D"))
            }
            Spacer()
            VStack(alignment: .leading) {
                Text("Net").foregroundStyle(PulseTheme.textMuted)
                Text(net.currencyString).foregroundStyle(net >= 0 ? PulseTheme.green : PulseTheme.red)
            }
        }
        .font(PulseFont.body(14, weight: .bold))
        .padding()
        .background(PulseTheme.surfaceStrong)
    }
}

struct GlobalSearchView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: PulseStore

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                HStack {
                    TextField("Keyword", text: $store.globalSearchQuery)
                        .textFieldStyle(PulseTextFieldStyle())
                        .onSubmit { store.runGlobalSearch() }
                    Button("Search") { store.runGlobalSearch() }
                        .buttonStyle(PrimaryButtonStyle())
                }

                Picker("Sort", selection: $store.globalSearchSort) {
                    ForEach(TransactionSort.allCases) { sort in
                        Text(sort.label).tag(sort)
                    }
                }
                .pickerStyle(.menu)

                List {
                    if store.globalSearchHasSearched && store.globalSearchResults.isEmpty {
                        EmptyStateView(message: "No Matching Transactions.")
                    } else {
                        ForEach(store.globalSearchResults) { transaction in
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
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                        }
                    }
                }
                .scrollContentBackground(.hidden)

                if store.globalSearchHasSearched {
                    let income = store.globalSearchResults.filter { $0.type == .income }.reduce(0) { $0 + $1.amount }
                    let spending = store.globalSearchResults.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount }
                    HStack {
                        Text("Matches: \(store.globalSearchResults.count)")
                        Spacer()
                        Text("Income: \(income.currencyString)")
                            .foregroundStyle(PulseTheme.green)
                        Spacer()
                        Text("Spending: \(spending.currencyString)")
                            .foregroundStyle(PulseTheme.red)
                    }
                    .font(PulseFont.body(12, weight: .bold))
                }
            }
            .padding()
            .background(PulseBackground())
            .navigationTitle("Global Search")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

struct TripSummaryView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: PulseStore

    private var filteredTransactions: [TransactionDTO] {
        if store.tripSummaryFilter == "all" {
            return store.transactions.filter { $0.tripID != nil }
        }
        return store.transactions.filter { $0.tripID == store.tripSummaryFilter }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                Picker("Trip", selection: $store.tripSummaryFilter) {
                    Text("All Trips").tag("all")
                    ForEach(store.trips) { trip in
                        Text(trip.name).tag(trip.id)
                    }
                }
                .pickerStyle(.menu)

                List(filteredTransactions) { transaction in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(transaction.description)
                            .font(PulseFont.body(15, weight: .bold))
                        Text("\(PulseDateUtils.displayString(from: transaction.date)) • \(transaction.category) • \(store.tripName(for: transaction.tripID))")
                            .font(PulseFont.body(12))
                            .foregroundStyle(PulseTheme.textMuted)
                        Text(transaction.amount.currencyString)
                            .foregroundStyle(transaction.type == .income ? PulseTheme.green : Color(hex: "#FF4F7D"))
                    }
                    .listRowBackground(PulseTheme.surface)
                }
                .scrollContentBackground(.hidden)

                Text("Total Spending: \(filteredTransactions.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount }.currencyString)")
                    .font(PulseFont.body(15, weight: .bold))
                    .padding()
            }
            .padding()
            .background(PulseBackground())
            .navigationTitle("Trip Summary")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

struct ManageTripsView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: PulseStore

    var body: some View {
        NavigationStack {
            List(store.trips) { trip in
                VStack(alignment: .leading, spacing: 6) {
                    Text(trip.name)
                        .font(PulseFont.body(16, weight: .bold))
                    Text("Total: \(store.tripSpending(for: trip.id).currencyString) • Linked Entries: \(store.tripLinkedCount(for: trip.id))")
                        .font(PulseFont.body(12))
                        .foregroundStyle(PulseTheme.textMuted)

                    HStack {
                        Button("Edit") {
                            store.presentPrompt(title: "Rename Trip", message: "Enter a new trip name.", defaultValue: trip.name) { name in
                                store.renameTrip(trip, to: name)
                            }
                        }
                        .buttonStyle(GhostButtonStyle())

                        Button("Delete") {
                            store.presentConfirm(
                                title: "Delete Trip?",
                                message: "This detaches the trip from linked transactions.",
                                destructive: true,
                                confirmTitle: "Delete"
                            ) {
                                store.deleteTrip(trip)
                            }
                        }
                        .buttonStyle(DangerButtonStyle())
                    }
                }
                .listRowBackground(PulseTheme.surface)
            }
            .scrollContentBackground(.hidden)
            .background(PulseBackground())
            .navigationTitle("Manage Trips")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

#if DEBUG
#Preview("Monthly Log") {
    MonthLogView(store: PreviewSupport.unlockedStore())
        .preferredColorScheme(.dark)
}

#Preview("Global Search") {
    GlobalSearchView(store: PreviewSupport.unlockedStore())
        .preferredColorScheme(.dark)
}
#endif
