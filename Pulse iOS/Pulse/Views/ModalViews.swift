import SwiftUI

struct ImportPreviewView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: PulseStore

    var body: some View {
        NavigationStack {
            ScrollView {
                if let preview = store.importPreview {
                    VStack(alignment: .leading, spacing: 16) {
                        summary(for: preview)

                        Toggle("Skip Duplicate Transactions", isOn: Binding(
                            get: { preview.skipDuplicates },
                            set: { value in
                                var updated = preview
                                updated.skipDuplicates = value
                                store.importPreview = updated
                            }
                        ))
                        .tint(PulseTheme.purple)

                        mappingSection(preview)

                        ForEach(preview.rows) { row in
                            ImportPreviewRowCard(row: row, categoryModel: store.categoryModel) { updated in
                                store.updateImportPreviewRow(updated)
                            }
                        }

                        HStack {
                            Button("Import Now") {
                                store.commitImportPreview()
                                dismiss()
                            }
                            .buttonStyle(PrimaryButtonStyle())

                            Button("Cancel") { dismiss() }
                                .buttonStyle(GhostButtonStyle())
                        }
                    }
                    .padding()
                }
            }
            .background(PulseBackground())
            .navigationTitle("Import Preview")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    private func summary(for preview: ImportPreviewState) -> some View {
        let ready = preview.rows.filter { $0.status == .ready }.count
        let invalid = preview.rows.filter { $0.status == .invalid }.count
        let duplicates = preview.rows.filter { $0.status == .duplicate }.count
        let fileDuplicates = preview.rows.filter { $0.status == .duplicateFile }.count
        return VStack(alignment: .leading, spacing: 8) {
            Text("Total Rows: \(preview.rows.count)")
            Text("Ready: \(ready) • Invalid: \(invalid) • Existing Dupes: \(duplicates) • File Dupes: \(fileDuplicates)")
                .foregroundStyle(PulseTheme.textMuted)
        }
        .font(PulseFont.body(14))
    }

    private func mappingSection(_ preview: ImportPreviewState) -> some View {
        PulseCard {
            VStack(alignment: .leading, spacing: 8) {
                Text("Column Mapping")
                    .font(PulseFont.heading(18))
                mappingPicker("Date", keyPath: \.date, headers: preview.headers)
                mappingPicker("Description", keyPath: \.description, headers: preview.headers)
                mappingPicker("Amount", keyPath: \.amount, headers: preview.headers)
                mappingPicker("Type", keyPath: \.type, headers: preview.headers)
                mappingPicker("Parent Category", keyPath: \.parentCategory, headers: preview.headers)
                mappingPicker("Category", keyPath: \.category, headers: preview.headers)
                mappingPicker("Trip", keyPath: \.trip, headers: preview.headers)
            }
        }
    }

    private func mappingPicker(
        _ title: String,
        keyPath: WritableKeyPath<ImportColumnMapping, String>,
        headers: [String]
    ) -> some View {
        HStack {
            Text(title)
                .foregroundStyle(PulseTheme.textMuted)
            Spacer()
            Picker(title, selection: Binding(
                get: { store.importPreview?.mapping[keyPath: keyPath] ?? "" },
                set: { value in
                    guard var mapping = store.importPreview?.mapping else { return }
                    mapping[keyPath: keyPath] = value
                    store.updateImportPreviewMapping(mapping)
                }
            )) {
                Text("Not Mapped").tag("")
                ForEach(headers, id: \.self) { header in
                    Text(header).tag(header)
                }
            }
            .labelsHidden()
            .pickerStyle(.menu)
        }
        .font(PulseFont.body(13))
    }
}

struct ImportPreviewRowCard: View {
    @State var row: ImportPreviewRow
    let categoryModel: CategoryModelPayload
    let onUpdate: (ImportPreviewRow) -> Void

    private var parentOptions: [String] {
        ClassificationService.parentCategories(for: row.type, model: categoryModel)
    }

    private var categoryOptions: [String] {
        ClassificationService.subcategories(
            for: row.type,
            parent: row.parentCategory,
            model: categoryModel
        )
    }

    var body: some View {
        PulseCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Row \(row.rowIndex + 1)")
                        .font(PulseFont.body(13, weight: .bold))
                    Spacer()
                    Text(row.status.rawValue.capitalized)
                        .font(PulseFont.body(12, weight: .bold))
                        .foregroundStyle(statusColor)
                }

                TextField("Description", text: $row.description)
                    .textFieldStyle(PulseTextFieldStyle())
                TextField("Date", text: $row.date)
                    .textFieldStyle(PulseTextFieldStyle())
                TextField("Amount", value: $row.amount, format: .number)
                    .textFieldStyle(PulseTextFieldStyle())

                Picker("Type", selection: $row.type) {
                    ForEach(TransactionType.allCases) { type in
                        Text(type.label).tag(type)
                    }
                }
                .pickerStyle(.segmented)
                .onChange(of: row.type) { _, _ in
                    row.parentCategory = parentOptions.first ?? ""
                    row.category = categoryOptions.first ?? ""
                }

                Picker("Parent Category", selection: $row.parentCategory) {
                    ForEach(parentOptions, id: \.self) { parent in
                        Text(parent).tag(parent)
                    }
                }
                .pickerStyle(.menu)
                .onChange(of: row.parentCategory) { _, _ in
                    if !categoryOptions.contains(row.category) {
                        row.category = categoryOptions.first ?? ""
                    }
                }

                Picker("Subcategory", selection: $row.category) {
                    ForEach(categoryOptions, id: \.self) { category in
                        Text(category).tag(category)
                    }
                }
                .pickerStyle(.menu)

                TextField("Trip (optional)", text: $row.tripName)
                    .textFieldStyle(PulseTextFieldStyle())

                Button("Apply Row Changes") {
                    onUpdate(row)
                }
                .buttonStyle(GhostButtonStyle())
            }
        }
    }

    private var statusColor: Color {
        switch row.status {
        case .ready: PulseTheme.green
        case .invalid: PulseTheme.red
        case .duplicate: PulseTheme.blue
        case .duplicateFile: PulseTheme.pink
        }
    }
}

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: PulseStore

    @State private var selectedType: TransactionType = .expense
    @State private var selectedParent = "Personal"
    @State private var selectedSubcategory = "Other"
    @State private var draftModel = DefaultCategoryModel.payload
    @State private var newKeyword = ""
    @State private var validationMessage = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if !validationMessage.isEmpty {
                        PulseStatusBanner(message: validationMessage, isError: true)
                    }

                    Picker("Type", selection: $selectedType) {
                        ForEach(TransactionType.allCases) { type in
                            Text(type.label).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: selectedType) { _, _ in refreshSelection() }

                    Picker("Parent", selection: $selectedParent) {
                        ForEach(currentGroups, id: \.name) { group in
                            Text(group.name).tag(group.name)
                        }
                    }
                    .pickerStyle(.menu)
                    .onChange(of: selectedParent) { _, _ in refreshSubcategorySelection() }

                    Picker("Subcategory", selection: $selectedSubcategory) {
                        ForEach(currentSubcategories, id: \.name) { subcategory in
                            Text(subcategory.name).tag(subcategory.name)
                        }
                    }
                    .pickerStyle(.menu)

                    HStack {
                        Button("Add Parent") {
                            store.presentPrompt(title: "Add Parent Category", message: "Enter a parent category name.") { name in
                                addParent(name)
                            }
                        }
                        Button("Rename Parent") {
                            store.presentPrompt(title: "Rename Parent", message: "Enter a new parent name.", defaultValue: selectedParent) { name in
                                renameParent(to: name)
                            }
                        }
                        Button("Delete Parent", role: .destructive) {
                            deleteParent()
                        }
                    }
                    .buttonStyle(GhostButtonStyle())

                    HStack {
                        Button("Add Subcategory") {
                            store.presentPrompt(title: "Add Subcategory", message: "Enter a subcategory name.") { name in
                                addSubcategory(name)
                            }
                        }
                        Button("Rename Subcategory") {
                            store.presentPrompt(title: "Rename Subcategory", message: "Enter a new subcategory name.", defaultValue: selectedSubcategory) { name in
                                renameSubcategory(to: name)
                            }
                        }
                        Button("Delete Subcategory", role: .destructive) {
                            deleteSubcategory()
                        }
                    }
                    .buttonStyle(GhostButtonStyle())

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Keywords")
                            .font(PulseFont.heading(18))
                        HStack {
                            TextField("New keyword", text: $newKeyword)
                                .textFieldStyle(PulseTextFieldStyle())
                            Button("Add") { addKeyword() }
                                .buttonStyle(GhostButtonStyle())
                        }
                        FlowLayout(items: selectedSubcategoryModel?.keywords ?? []) { keyword in
                            HStack(spacing: 6) {
                                Text(keyword)
                                Button {
                                    removeKeyword(keyword)
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                }
                            }
                            .font(PulseFont.body(12))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color(hex: "#241D3D"), in: Capsule())
                        }
                    }

                    modelTable

                    HStack {
                        Button("Reset To Default") {
                            draftModel = DefaultCategoryModel.payload
                            refreshSelection()
                        }
                        .buttonStyle(GhostButtonStyle())

                        Button("Save Categories") {
                            store.saveCategoryModel(draftModel)
                        }
                        .buttonStyle(PrimaryButtonStyle())
                    }
                }
                .padding()
            }
            .background(PulseBackground())
            .navigationTitle("Category Settings")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .onAppear {
                draftModel = store.categoryModel
                refreshSelection()
            }
        }
    }

    private var currentGroups: [CategoryGroup] {
        selectedType == .income ? draftModel.income : draftModel.expense
    }

    private var currentSubcategories: [CategorySubcategory] {
        currentGroups.first(where: { $0.name == selectedParent })?.subcategories ?? []
    }

    private var selectedSubcategoryModel: CategorySubcategory? {
        currentSubcategories.first(where: { $0.name == selectedSubcategory })
    }

    private var modelTable: some View {
        PulseCard {
            VStack(alignment: .leading, spacing: 8) {
                Text("Category Model")
                    .font(PulseFont.heading(18))
                ForEach(TransactionType.allCases) { type in
                    Text(type.label)
                        .font(PulseFont.body(13, weight: .bold))
                        .foregroundStyle(type == .income ? PulseTheme.green : PulseTheme.pink)
                    ForEach(type == .income ? draftModel.income : draftModel.expense) { group in
                        Text(group.name)
                            .font(PulseFont.body(14, weight: .bold))
                        ForEach(group.subcategories) { subcategory in
                            Text("• \(subcategory.name) (\(subcategory.keywords.count) keywords)")
                                .font(PulseFont.body(12))
                                .foregroundStyle(PulseTheme.textMuted)
                        }
                    }
                }
            }
        }
    }

    private func refreshSelection() {
        selectedParent = currentGroups.first?.name ?? (selectedType == .income ? "Income" : "Personal")
        refreshSubcategorySelection()
    }

    private func refreshSubcategorySelection() {
        selectedSubcategory = currentSubcategories.first?.name ?? "Other"
    }

    private func updateGroups(_ groups: [CategoryGroup]) {
        if selectedType == .income {
            draftModel.income = groups
        } else {
            draftModel.expense = groups
        }
    }

    private func addParent(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        guard !currentGroups.contains(where: { $0.name.caseInsensitiveCompare(trimmed) == .orderedSame }) else {
            validationMessage = "That Parent Category Already Exists."
            return
        }
        validationMessage = ""
        var groups = currentGroups
        groups.append(CategoryGroup(name: trimmed, subcategories: [CategorySubcategory(name: "Other", keywords: [])]))
        updateGroups(groups)
        selectedParent = trimmed
        refreshSubcategorySelection()
    }

    private func renameParent(to name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        guard !currentGroups.contains(where: {
            $0.name != selectedParent && $0.name.caseInsensitiveCompare(trimmed) == .orderedSame
        }) else {
            validationMessage = "That Parent Category Already Exists."
            return
        }
        validationMessage = ""
        var groups = currentGroups
        guard let index = groups.firstIndex(where: { $0.name == selectedParent }) else { return }
        groups[index].name = trimmed
        updateGroups(groups)
        selectedParent = trimmed
    }

    private func deleteParent() {
        guard currentGroups.count > 1 else {
            validationMessage = "At Least One Parent Category Is Required."
            return
        }
        validationMessage = ""
        var groups = currentGroups
        groups.removeAll { $0.name == selectedParent }
        updateGroups(groups)
        refreshSelection()
    }

    private func addSubcategory(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        guard !currentSubcategories.contains(where: { $0.name.caseInsensitiveCompare(trimmed) == .orderedSame }) else {
            validationMessage = "That Subcategory Already Exists."
            return
        }
        validationMessage = ""
        var groups = currentGroups
        guard let index = groups.firstIndex(where: { $0.name == selectedParent }) else { return }
        groups[index].subcategories.append(CategorySubcategory(name: trimmed, keywords: []))
        updateGroups(groups)
        selectedSubcategory = trimmed
    }

    private func renameSubcategory(to name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        guard !currentSubcategories.contains(where: {
            $0.name != selectedSubcategory && $0.name.caseInsensitiveCompare(trimmed) == .orderedSame
        }) else {
            validationMessage = "That Subcategory Already Exists."
            return
        }
        validationMessage = ""
        var groups = currentGroups
        guard let groupIndex = groups.firstIndex(where: { $0.name == selectedParent }),
              let subIndex = groups[groupIndex].subcategories.firstIndex(where: { $0.name == selectedSubcategory }) else { return }
        groups[groupIndex].subcategories[subIndex].name = trimmed
        updateGroups(groups)
        selectedSubcategory = trimmed
    }

    private func deleteSubcategory() {
        guard currentSubcategories.count > 1 else {
            validationMessage = "At Least One Subcategory Is Required."
            return
        }
        validationMessage = ""
        var groups = currentGroups
        guard let groupIndex = groups.firstIndex(where: { $0.name == selectedParent }) else { return }
        groups[groupIndex].subcategories.removeAll { $0.name == selectedSubcategory }
        updateGroups(groups)
        refreshSubcategorySelection()
    }

    private func addKeyword() {
        let trimmed = newKeyword.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        var groups = currentGroups
        guard let groupIndex = groups.firstIndex(where: { $0.name == selectedParent }),
              let subIndex = groups[groupIndex].subcategories.firstIndex(where: { $0.name == selectedSubcategory }) else { return }
        if !groups[groupIndex].subcategories[subIndex].keywords.contains(where: { $0.caseInsensitiveCompare(trimmed) == .orderedSame }) {
            groups[groupIndex].subcategories[subIndex].keywords.append(trimmed.lowercased())
        }
        updateGroups(groups)
        newKeyword = ""
    }

    private func removeKeyword(_ keyword: String) {
        var groups = currentGroups
        guard let groupIndex = groups.firstIndex(where: { $0.name == selectedParent }),
              let subIndex = groups[groupIndex].subcategories.firstIndex(where: { $0.name == selectedSubcategory }) else { return }
        groups[groupIndex].subcategories[subIndex].keywords.removeAll { $0 == keyword }
        updateGroups(groups)
    }
}

struct SavingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: PulseStore

    @State private var name = ""
    @State private var targetAmount = ""
    @State private var bufferMonths = 2

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TextField("Goal Name", text: $name)
                        .textFieldStyle(PulseTextFieldStyle())
                    TextField("Target Amount", text: $targetAmount)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(PulseTextFieldStyle())
                    Stepper("Comfort Buffer: \(bufferMonths) months", value: $bufferMonths, in: 0...24)

                    Button("Save Goal") {
                        store.saveSavingsGoal(
                            name: name,
                            targetAmount: Double(targetAmount) ?? 0,
                            bufferMonths: bufferMonths
                        )
                    }
                    .buttonStyle(PrimaryButtonStyle())

                    let metrics = store.savingsMetrics
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        savingsCard("Goal", metrics.target > 0 ? (store.savingsGoal.name) : "No Goal Set")
                        savingsCard("Target", metrics.target > 0 ? metrics.target.currencyString : "Set A Target")
                        savingsCard("Net Saved (Raw)", metrics.currentSaved.currencyString)
                        savingsCard("Comfort Buffer", metrics.comfortBuffer.currencyString)
                        savingsCard("Safe To Use For Goal", metrics.comfortableSaved.currencyString)
                        savingsCard("Remaining", metrics.target > 0 ? metrics.remaining.currencyString : "-")
                        savingsCard("Progress", metrics.target > 0 ? "\(Int(metrics.progress.rounded()))%" : "-")
                        savingsCard("Est. Time To Goal", metrics.monthsToGoal.map { "\($0) Month\($0 == 1 ? "" : "s")" } ?? "-")
                        savingsCard("Avg Monthly Income", metrics.avgMonthlyIncome.currencyString)
                        savingsCard("Avg Monthly Spending", metrics.avgMonthlySpending.currencyString)
                        savingsCard("Avg Monthly Net", metrics.avgMonthlyNet.currencyString)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Insights")
                            .font(PulseFont.heading(20))
                        ForEach(insights(for: metrics), id: \.self) { insight in
                            Text("• \(insight)")
                                .font(PulseFont.body(13))
                                .foregroundStyle(PulseTheme.textMuted)
                        }
                    }
                }
                .padding()
            }
            .background(PulseBackground())
            .navigationTitle("Savings Tracker")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .onAppear {
                name = store.savingsGoal.name
                targetAmount = store.savingsGoal.targetAmount > 0 ? String(format: "%.2f", store.savingsGoal.targetAmount) : ""
                bufferMonths = store.savingsGoal.bufferMonths
            }
        }
    }

    private func savingsCard(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(PulseFont.body(12))
                .foregroundStyle(PulseTheme.textMuted)
            Text(value)
                .font(PulseFont.heading(18))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(PulseTheme.surfaceStrong.opacity(0.85), in: RoundedRectangle(cornerRadius: PulseTheme.radius))
    }

    private func insights(for metrics: SavingsMetrics) -> [String] {
        var items: [String] = []
        if metrics.monthsTracked == 0 {
            items.append("Add Transactions To Start Tracking Savings Insights.")
            return items
        }

        items.append("Tracking \(metrics.monthsTracked) Month\(metrics.monthsTracked == 1 ? "" : "s") Of Data.")

        if metrics.avgMonthlyNet > 0 {
            items.append("At Your Current Pace, You Add About \(metrics.avgMonthlyNet.currencyString) Per Month.")
        } else if metrics.avgMonthlyNet < 0 {
            items.append("Your Average Net Is \(metrics.avgMonthlyNet.currencyString) Per Month. Reduce Spending Or Increase Income To Reach The Goal.")
        } else {
            items.append("Your Monthly Net Is Around Break-Even. Any Spending Cuts Can Accelerate Progress.")
        }

        items.append("Comfort Rule: Reserve \(metrics.bufferMonths) Month\(metrics.bufferMonths == 1 ? "" : "s") Of Average Spending (\(metrics.comfortBuffer.currencyString)) Before Counting Goal Progress.")

        if metrics.spendingRatio >= 0.85 {
            items.append("Spending Is Using Most Of Income. Consider A Spending Cap For Top Expense Categories.")
        } else if metrics.spendingRatio <= 0.65 {
            items.append("Great Discipline: You Keep A Strong Gap Between Income And Spending.")
        } else {
            items.append("You Are In A Balanced Zone. Small Weekly Cuts Can Still Improve Goal Speed.")
        }

        if metrics.target > 0, metrics.comfortableSaved >= metrics.target {
            items.append("Goal Reached Comfortably. You Hit The Target While Keeping A Safety Buffer.")
        } else if metrics.target > 0, let months = metrics.monthsToGoal {
            items.append("Estimated Comfortable Completion: About \(months) Month\(months == 1 ? "" : "s") At Current Averages.")
        }

        return items
    }
}

struct AppDialogView: View {
    @Bindable var store: PulseStore
    let dialog: AppDialogRequest
    @State private var promptValue = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(dialog.title)
                .font(PulseFont.heading(22))
            Text(dialog.message)
                .font(PulseFont.body(14))
                .foregroundStyle(PulseTheme.textMuted)

            if case .prompt(let defaultValue) = dialog.mode {
                TextField("Value", text: $promptValue)
                    .textFieldStyle(PulseTextFieldStyle())
                    .onAppear { promptValue = defaultValue }
            }

            HStack {
                Button(dialog.cancelTitle) {
                    store.cancelDialog()
                }
                .buttonStyle(GhostButtonStyle())

                if dialog.isDestructive {
                    Button(dialog.confirmTitle) {
                        store.confirmDialog(input: promptValue)
                    }
                    .buttonStyle(DangerButtonStyle())
                } else {
                    Button(dialog.confirmTitle) {
                        store.confirmDialog(input: promptValue)
                    }
                    .buttonStyle(PrimaryButtonStyle())
                }
            }
        }
        .padding()
        .background(PulseBackground())
    }
}

struct FlowLayout<Data: RandomAccessCollection, Content: View>: View where Data.Element: Hashable {
    let items: Data
    let content: (Data.Element) -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(items), id: \.self) { item in
                content(item)
            }
        }
    }
}

#if DEBUG
#Preview("Privacy Gate") {
    PrivacyGateView(store: PreviewSupport.lockedStore())
        .preferredColorScheme(.dark)
}

#Preview("Dashboard") {
    DashboardView(store: PreviewSupport.unlockedStore())
        .preferredColorScheme(.dark)
}

#Preview("Empty Dashboard") {
    DashboardView(store: PreviewSupport.emptyStore())
        .preferredColorScheme(.dark)
}

#Preview("Quick Add") {
    QuickAddView(store: PreviewSupport.unlockedStore())
        .preferredColorScheme(.dark)
}

#Preview("Savings") {
    SavingsView(store: PreviewSupport.unlockedStore())
        .preferredColorScheme(.dark)
}

#Preview("Import Preview") {
    ImportPreviewView(store: PreviewSupport.importStore())
        .preferredColorScheme(.dark)
}

#Preview("Category Settings") {
    SettingsView(store: PreviewSupport.unlockedStore())
        .preferredColorScheme(.dark)
}
#endif
