import Foundation
import UniformTypeIdentifiers
import CoreXLSX
import ZIPFoundation

enum SpreadsheetParser {
    static func parseRows(from url: URL) throws -> [[String: String]] {
        let ext = url.pathExtension.lowercased()
        if ext == "csv" {
            return try parseCSV(from: url)
        }
        return try parseXLSX(from: url)
    }

    static func parseCSV(from url: URL) throws -> [[String: String]] {
        let content = try String(contentsOf: url, encoding: .utf8)
        let lines = content.split(whereSeparator: \.isNewline).map(String.init)
        guard let headerLine = lines.first else { return [] }

        let headers = splitCSVLine(headerLine)
        return lines.dropFirst().compactMap { line in
            let values = splitCSVLine(line)
            guard !values.allSatisfy({ $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) else { return nil }
            var row: [String: String] = [:]
            for (index, header) in headers.enumerated() where index < values.count {
                row[header] = values[index]
            }
            return row
        }
    }

    static func parseXLSX(from url: URL) throws -> [[String: String]] {
        guard let file = XLSXFile(filepath: url.path) else {
            throw ImportExportError.unsupportedFormat
        }

        let sharedStrings = try file.parseSharedStrings()
        guard let workbook = try file.parseWorkbooks().first else {
            throw ImportExportError.emptyWorkbook
        }

        let worksheetPaths = try file.parseWorksheetPathsAndNames(workbook: workbook)
        guard let firstSheet = worksheetPaths.first else {
            throw ImportExportError.emptyWorkbook
        }

        let worksheet = try file.parseWorksheet(at: firstSheet.path)
        let cellRows = worksheet.data?.rows ?? []
        guard let headerRow = cellRows.first else { return [] }

        let headers = headerRow.cells.compactMap { cell -> String? in
            guard let sharedStrings else { return cell.value }
            return cell.stringValue(sharedStrings)?.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
        }

        return cellRows.dropFirst().compactMap { row in
            var record: [String: String] = [:]
            for (index, cell) in row.cells.enumerated() where index < headers.count {
                record[headers[index]] = cellValue(cell, sharedStrings: sharedStrings)
            }
            guard !record.values.allSatisfy({ $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) else { return nil }
            return record
        }
    }

    private static func cellValue(_ cell: Cell, sharedStrings: SharedStrings?) -> String {
        if let sharedStrings, let value = cell.stringValue(sharedStrings) {
            return value
        }
        if let value = cell.value {
            return value
        }
        return ""
    }

    private static func splitCSVLine(_ line: String) -> [String] {
        var values: [String] = []
        var current = ""
        var inQuotes = false
        var index = line.startIndex

        while index < line.endIndex {
            let character = line[index]
            if character == "\"" {
                let next = line.index(after: index)
                if inQuotes, next < line.endIndex, line[next] == "\"" {
                    current.append("\"")
                    index = line.index(after: next)
                    continue
                }
                inQuotes.toggle()
            } else if character == ",", !inQuotes {
                values.append(current)
                current = ""
            } else {
                current.append(character)
            }
            index = line.index(after: index)
        }

        values.append(current)
        return values
    }
}

enum ImportExportError: LocalizedError {
    case unsupportedFormat
    case emptyWorkbook
    case invalidRow
    case exportFailed

    var errorDescription: String? {
        switch self {
        case .unsupportedFormat: "Unsupported file format."
        case .emptyWorkbook: "The selected workbook is empty."
        case .invalidRow: "One or more rows could not be imported."
        case .exportFailed: "The Excel workbook could not be created."
        }
    }
}

enum ImportService {
    static func buildMapping(headers: [String], overrides: ImportColumnMapping? = nil) -> ImportColumnMapping {
        func find(_ patterns: [String]) -> String {
            headers.first { header in
                patterns.contains { pattern in
                    header.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil
                }
            } ?? ""
        }

        let mapping = ImportColumnMapping(
            date: find(["^date$", "transaction\\s*date", "posted"]),
            description: find(["description", "merchant", "details", "memo", "name"]),
            amount: find(["^amount$", "value", "total", "cost"]),
            type: find(["^type$", "income|expense"]),
            parentCategory: find(["parent", "main\\s*category"]),
            category: find(["^category$", "subcategory", "group", "class"]),
            trip: find(["^trip$", "trip\\s*name"])
        )

        guard let overrides else { return mapping }
        return ImportColumnMapping(
            date: overrides.date.isEmpty ? mapping.date : overrides.date,
            description: overrides.description.isEmpty ? mapping.description : overrides.description,
            amount: overrides.amount.isEmpty ? mapping.amount : overrides.amount,
            type: overrides.type.isEmpty ? mapping.type : overrides.type,
            parentCategory: overrides.parentCategory.isEmpty ? mapping.parentCategory : overrides.parentCategory,
            category: overrides.category.isEmpty ? mapping.category : overrides.category,
            trip: overrides.trip.isEmpty ? mapping.trip : overrides.trip
        )
    }

    static func buildPreview(
        rows: [[String: String]],
        mapping: ImportColumnMapping,
        existingTransactions: [TransactionDTO],
        categoryModel: CategoryModelPayload
    ) -> ImportPreviewState {
        let duplicateKeys = Set(existingTransactions.map {
            DuplicateKeyBuilder.build(date: $0.date, description: $0.description, type: $0.type, amount: $0.amount)
        })
        var batchDuplicateKeys: Set<String> = []

        let previewRows: [ImportPreviewRow] = rows.enumerated().compactMap { index, row in
            let dateRaw = row[mapping.date] ?? ""
            let description = row[mapping.description]?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let amount = PulseDateUtils.normalizeAmount(row[mapping.amount])
            let type = normalizeType(row[mapping.type], amount: amount)
            let date = PulseDateUtils.normalizeDateIfValid(dateRaw) ?? ""

            guard !date.isEmpty, !description.isEmpty, amount.isFinite, amount != 0 else {
                return ImportPreviewRow(
                    id: UUID().uuidString,
                    rowIndex: index,
                    date: date,
                    description: description,
                    amount: amount.isFinite ? abs(amount) : 0,
                    type: type,
                    parentCategory: "",
                    category: "",
                    tripName: row[mapping.trip]?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "",
                    status: .invalid,
                    isEdited: false
                )
            }

            let assignment = ClassificationService.normalizeCategory(
                value: row[mapping.category],
                parentCategory: row[mapping.parentCategory],
                type: type,
                description: description,
                model: categoryModel
            )

            let duplicateKey = DuplicateKeyBuilder.build(
                date: date,
                description: description,
                type: type,
                amount: abs(amount)
            )
            let status: ImportRowStatus
            if duplicateKeys.contains(duplicateKey) {
                status = .duplicate
            } else if batchDuplicateKeys.contains(duplicateKey) {
                status = .duplicateFile
            } else {
                status = .ready
                batchDuplicateKeys.insert(duplicateKey)
            }

            return ImportPreviewRow(
                id: UUID().uuidString,
                rowIndex: index,
                date: date,
                description: description,
                amount: abs(amount),
                type: type,
                parentCategory: assignment.parentCategory,
                category: assignment.category,
                tripName: row[mapping.trip]?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "",
                status: status,
                isEdited: false
            )
        }

        let headers = rows.first.map { Array($0.keys) } ?? []
        return ImportPreviewState(
            headers: headers,
            mapping: mapping,
            sourceRows: rows,
            rows: previewRows,
            skipDuplicates: true
        )
    }

    static func commitPreview(
        _ preview: ImportPreviewState,
        existingTrips: [TripDTO]
    ) -> (transactions: [TransactionDTO], trips: [TripDTO]) {
        var trips = existingTrips
        var transactions: [TransactionDTO] = []

        for row in preview.rows {
            if row.status == .invalid { continue }
            if preview.skipDuplicates && (row.status == .duplicate || row.status == .duplicateFile) { continue }

            var tripID: String?
            if !row.tripName.isEmpty {
                if let existing = trips.first(where: { $0.name.caseInsensitiveCompare(row.tripName) == .orderedSame }) {
                    tripID = existing.id
                } else {
                    let trip = TripDTO(name: row.tripName)
                    trips.append(trip)
                    tripID = trip.id
                }
            }

            transactions.append(
                TransactionDTO(
                    date: row.date,
                    description: row.description,
                    parentCategory: row.parentCategory,
                    tripID: tripID,
                    category: row.category,
                    type: row.type,
                    amount: row.amount
                )
            )
        }

        return (transactions, trips)
    }

    private static func normalizeType(_ raw: String?, amount: Double) -> TransactionType {
        let value = raw?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        if value.contains("income") || value.contains("credit") { return .income }
        if value.contains("expense") || value.contains("debit") { return .expense }
        return amount < 0 ? .expense : .income
    }
}

enum ExportService {
    static func backupCSV(transactions: [TransactionDTO], trips: [TripDTO]) -> String {
        let tripLookup = Dictionary(uniqueKeysWithValues: trips.map { ($0.id, $0.name) })
        var lines = ["Date,Description,Amount,Type,Parent Category,Category,Trip"]
        for transaction in AnalyticsService.sortTransactions(transactions, by: .dateDesc) {
            let tripName = transaction.tripID.flatMap { tripLookup[$0] } ?? ""
            lines.append([
                transaction.date,
                transaction.description.escapedForCSV,
                String(format: "%.2f", transaction.amount),
                transaction.type.rawValue,
                transaction.parentCategory.escapedForCSV,
                transaction.category.escapedForCSV,
                tripName.escapedForCSV
            ].joined(separator: ","))
        }
        return lines.joined(separator: "\n")
    }

    static func exportWorkbookData(transactions: [TransactionDTO], trips: [TripDTO]) throws -> Data {
        let fileManager = FileManager.default
        let root = fileManager.temporaryDirectory.appendingPathComponent("pulse-xlsx-\(UUID().uuidString)", isDirectory: true)
        let archiveURL = root.appendingPathExtension("xlsx")
        try fileManager.createDirectory(at: root, withIntermediateDirectories: true)
        defer {
            try? fileManager.removeItem(at: root)
            try? fileManager.removeItem(at: archiveURL)
        }

        let sorted = AnalyticsService.sortTransactions(transactions, by: .dateAsc)
        let grouped = Dictionary(grouping: sorted, by: { PulseDateUtils.monthKey(for: $0.date) })
        let monthKeys = grouped.keys.sorted()
        let sheets = ["Summary"] + monthKeys.map { monthSheetName($0) }

        try writeXML(contentTypes(sheetCount: sheets.count), to: root, path: "[Content_Types].xml")
        try writeXML(packageRelationships, to: root, path: "_rels/.rels")
        try writeXML(workbookXML(sheetNames: sheets), to: root, path: "xl/workbook.xml")
        try writeXML(workbookRelationships(sheetCount: sheets.count), to: root, path: "xl/_rels/workbook.xml.rels")
        try writeXML(stylesXML, to: root, path: "xl/styles.xml")
        try writeXML(summarySheet(transactions: sorted), to: root, path: "xl/worksheets/sheet1.xml")

        let tripLookup = Dictionary(uniqueKeysWithValues: trips.map { ($0.id, $0.name) })
        for (index, key) in monthKeys.enumerated() {
            try writeXML(
                transactionSheet(transactions: grouped[key] ?? [], tripLookup: tripLookup),
                to: root,
                path: "xl/worksheets/sheet\(index + 2).xml"
            )
        }

        guard let archive = Archive(url: archiveURL, accessMode: .create) else {
            throw ImportExportError.exportFailed
        }
        let files = try fileManager.subpathsOfDirectory(atPath: root.path)
        for path in files {
            let fileURL = root.appendingPathComponent(path)
            var isDirectory: ObjCBool = false
            guard fileManager.fileExists(atPath: fileURL.path, isDirectory: &isDirectory), !isDirectory.boolValue else {
                continue
            }
            try archive.addEntry(with: path, relativeTo: root)
        }
        return try Data(contentsOf: archiveURL)
    }

    private static func writeXML(_ xml: String, to root: URL, path: String) throws {
        let url = root.appendingPathComponent(path)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        guard let data = xml.data(using: .utf8) else { throw ImportExportError.exportFailed }
        try data.write(to: url, options: .atomic)
    }

    private static func monthSheetName(_ key: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM"
        guard let date = formatter.date(from: key) else { return key }
        formatter.dateFormat = "MMM yyyy"
        return formatter.string(from: date)
    }

    private static func contentTypes(sheetCount: Int) -> String {
        let sheets = (1...sheetCount).map {
            #"<Override PartName="/xl/worksheets/sheet\#($0).xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>"#
        }.joined()
        return #"<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\#(sheets)</Types>"#
    }

    private static let packageRelationships =
        #"<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>"#

    private static func workbookXML(sheetNames: [String]) -> String {
        let sheets = sheetNames.enumerated().map { index, name in
            #"<sheet name="\#(xmlEscape(name))" sheetId="\#(index + 1)" r:id="rId\#(index + 1)"/>"#
        }.joined()
        return #"<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>\#(sheets)</sheets></workbook>"#
    }

    private static func workbookRelationships(sheetCount: Int) -> String {
        let sheets = (1...sheetCount).map {
            #"<Relationship Id="rId\#($0)" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet\#($0).xml"/>"#
        }.joined()
        return #"<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\#(sheets)<Relationship Id="rId\#(sheetCount + 1)" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>"#
    }

    private static let stylesXML =
        #"<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF6E20A8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFill="1" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs><numFmts count="1"><numFmt numFmtId="164" formatCode="$#,##0.00"/></numFmts></styleSheet>"#

    private static func summarySheet(transactions: [TransactionDTO]) -> String {
        let income = transactions.filter { $0.type == .income }.reduce(0) { $0 + $1.amount }
        let spending = transactions.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount }
        let rows: [[String]] = [
            ["Pulse Budget Summary", ""],
            ["Metric", "Amount"],
            ["Total Income", String(income)],
            ["Total Spending", String(spending)],
            ["Net", String(income - spending)],
            ["Transactions", String(transactions.count)]
        ]
        return worksheetXML(rows: rows, currencyColumns: [2], headerRows: [1, 2])
    }

    private static func transactionSheet(transactions: [TransactionDTO], tripLookup: [String: String]) -> String {
        var rows = [["Date", "Description", "Amount", "Type", "Parent Category", "Category", "Trip"]]
        rows += transactions.map {
            [
                $0.date,
                $0.description,
                String($0.amount),
                $0.type.rawValue,
                $0.parentCategory,
                $0.category,
                $0.tripID.flatMap { tripLookup[$0] } ?? ""
            ]
        }
        return worksheetXML(rows: rows, currencyColumns: [3], headerRows: [1])
    }

    private static func worksheetXML(rows: [[String]], currencyColumns: Set<Int>, headerRows: Set<Int>) -> String {
        let body = rows.enumerated().map { rowIndex, values in
            let rowNumber = rowIndex + 1
            let cells = values.enumerated().map { columnIndex, value in
                let column = columnName(columnIndex + 1)
                let style = headerRows.contains(rowNumber) ? 1 : (currencyColumns.contains(columnIndex + 1) ? 2 : 0)
                if style == 2, Double(value) != nil {
                    return #"<c r="\#(column)\#(rowNumber)" s="2"><v>\#(value)</v></c>"#
                }
                return #"<c r="\#(column)\#(rowNumber)" t="inlineStr" s="\#(style)"><is><t>\#(xmlEscape(value))</t></is></c>"#
            }.joined()
            return #"<row r="\#(rowNumber)">\#(cells)</row>"#
        }.joined()
        return #"<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>\#(body)</sheetData></worksheet>"#
    }

    private static func columnName(_ index: Int) -> String {
        var number = index
        var result = ""
        while number > 0 {
            number -= 1
            result = String(UnicodeScalar(65 + number % 26)!) + result
            number /= 26
        }
        return result
    }

    private static func xmlEscape(_ value: String) -> String {
        value
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&apos;")
    }
}

extension UTType {
    static let pulseImportTypes: [UTType] = [.commaSeparatedText, .spreadsheet, .data]
}
