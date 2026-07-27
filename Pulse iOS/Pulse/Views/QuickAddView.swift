import SwiftUI

struct QuickAddView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: PulseStore

    @State private var description = ""
    @State private var amount = ""
    @State private var date = PulseDateUtils.todayString()
    @State private var type: TransactionType = .expense
    @State private var parentCategory = "Personal"
    @State private var category = "Other"
    @State private var selectedTripID = ""
    @State private var showTripSection = false
    @State private var showRecurrenceSection = false
    @State private var recurrenceFrequency: RecurrenceFrequency = .none
    @State private var recurrenceCount = 1

    private var editingTransaction: TransactionDTO? {
        guard let id = store.editingTransactionID else { return nil }
        return store.transactions.first(where: { $0.id == id })
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    formField("Description") {
                        TextField("Coffee, paycheck, flight...", text: $description)
                            .accessibilityIdentifier("transactionDescription")
                            .textFieldStyle(PulseTextFieldStyle())
                            .onChange(of: description) { _, _ in
                                applySuggestion()
                            }
                    }

                    formField("Amount") {
                        TextField("0.00", text: $amount)
                            .accessibilityIdentifier("transactionAmount")
                            .keyboardType(.decimalPad)
                            .textFieldStyle(PulseTextFieldStyle())
                    }

                    formField("Date") {
                        DatePicker(
                            "Transaction Date",
                            selection: Binding(
                                get: { PulseDateUtils.dateFromString(date) ?? Date() },
                                set: { date = PulseDateUtils.normalizeDate($0) }
                            ),
                            displayedComponents: .date
                        )
                        .datePickerStyle(.compact)
                        .labelsHidden()
                    }

                    formField("Type") {
                        Picker("Type", selection: $type) {
                            ForEach(TransactionType.allCases) { item in
                                Text(item.label).tag(item)
                            }
                        }
                        .pickerStyle(.segmented)
                        .onChange(of: type) { _, _ in
                            refreshCategoryOptions()
                            applySuggestion()
                        }
                    }

                    if type == .expense {
                        formField("Parent Category") {
                            Picker("Parent Category", selection: $parentCategory) {
                                ForEach(ClassificationService.parentCategories(for: type, model: store.categoryModel), id: \.self) { item in
                                    Text(item).tag(item)
                                }
                            }
                            .pickerStyle(.menu)
                            .onChange(of: parentCategory) { _, _ in
                                let subs = ClassificationService.subcategories(for: type, parent: parentCategory, model: store.categoryModel)
                                category = subs.first ?? "Other"
                            }
                        }
                    }

                    formField("Subcategory") {
                        Picker("Subcategory", selection: $category) {
                            ForEach(currentSubcategories, id: \.self) { item in
                                Text(item).tag(item)
                            }
                        }
                        .pickerStyle(.menu)
                    }

                    DisclosureGroup("Optional Fields", isExpanded: $showTripSection) {
                        VStack(alignment: .leading, spacing: 12) {
                            Picker("Trip", selection: $selectedTripID) {
                                Text("None").tag("")
                                ForEach(store.trips) { trip in
                                    Text(trip.name).tag(trip.id)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        .padding(.top, 8)
                    }

                    DisclosureGroup("Recurring", isExpanded: $showRecurrenceSection) {
                        VStack(alignment: .leading, spacing: 12) {
                            Picker("Frequency", selection: $recurrenceFrequency) {
                                ForEach(RecurrenceFrequency.allCases) { item in
                                    Text(item.label).tag(item)
                                }
                            }
                            .pickerStyle(.menu)
                            .onChange(of: recurrenceFrequency) { _, frequency in
                                if frequency == .none {
                                    recurrenceCount = 1
                                }
                            }

                            Stepper("Count: \(recurrenceCount)", value: $recurrenceCount, in: 1...PulseConstants.maxRecurrenceCount)
                                .disabled(recurrenceFrequency == .none)
                        }
                        .padding(.top, 8)
                    }

                    Button(editingTransaction == nil ? "Add Entry" : "Update Transaction") {
                        submit()
                    }
                    .accessibilityIdentifier("submitTransaction")
                    .buttonStyle(PrimaryButtonStyle())
                    .frame(maxWidth: .infinity)

                    if editingTransaction != nil {
                        Button("Cancel Edit") {
                            store.cancelEditing()
                            dismiss()
                        }
                        .buttonStyle(GhostButtonStyle())
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding()
            }
            .background(PulseBackground())
            .navigationTitle(editingTransaction == nil ? "Quick Add" : "Edit Transaction")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .onAppear(perform: populateIfEditing)
        }
    }

    private var currentSubcategories: [String] {
        if type == .income {
            return ClassificationService.subcategories(for: .income, parent: "Income", model: store.categoryModel)
        }
        return ClassificationService.subcategories(for: .expense, parent: parentCategory, model: store.categoryModel)
    }

    private func formField<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(PulseFont.body(13, weight: .medium))
                .foregroundStyle(PulseTheme.textMuted)
            content()
        }
    }

    private func populateIfEditing() {
        guard let transaction = editingTransaction else { return }
        description = transaction.description
        amount = String(format: "%.2f", transaction.amount)
        date = transaction.date
        type = transaction.type
        parentCategory = transaction.parentCategory
        category = transaction.category
        selectedTripID = transaction.tripID ?? ""
        showTripSection = transaction.tripID != nil
    }

    private func refreshCategoryOptions() {
        if type == .income {
            parentCategory = "Income"
            category = currentSubcategories.first ?? "Other Income"
        } else if !ClassificationService.parentCategories(for: .expense, model: store.categoryModel).contains(parentCategory) {
            parentCategory = "Personal"
            category = "Other"
        }
    }

    private func applySuggestion() {
        guard store.editingTransactionID == nil else { return }
        let suggestion = ClassificationService.suggestCategory(from: description, type: type, model: store.categoryModel)
        parentCategory = suggestion.parentCategory
        category = suggestion.category
    }

    private func submit() {
        guard let parsedAmount = Double(amount.replacingOccurrences(of: ",", with: "")), parsedAmount > 0 else {
            store.setStatus("Amount Must Be Greater Than 0.", isError: true)
            return
        }

        store.addOrUpdateTransaction(
            description: description,
            amount: parsedAmount,
            date: date,
            type: type,
            parentCategory: parentCategory,
            category: category,
            tripID: selectedTripID.isEmpty ? nil : selectedTripID,
            frequency: recurrenceFrequency,
            recurrenceCount: recurrenceCount
        )
        dismiss()
    }
}
