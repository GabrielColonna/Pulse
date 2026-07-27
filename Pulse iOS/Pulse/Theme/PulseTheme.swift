import SwiftUI

enum PulseTheme {
    static let bgA = Color(hex: "#07070F")
    static let bgB = Color(hex: "#120A28")
    static let surface = Color(hex: "#141224").opacity(0.9)
    static let surfaceStrong = Color(hex: "#161328")
    static let textMain = Color(hex: "#F4EEFF")
    static let textMuted = Color(hex: "#BBA7DB")
    static let purple = Color(hex: "#B400FF")
    static let pink = Color(hex: "#FF2BD6")
    static let green = Color(hex: "#35FF86")
    static let red = Color(hex: "#FF4766")
    static let blue = Color(hex: "#4ABFFF")
    static let line = Color(hex: "#322B4F")
    static let radius: CGFloat = 18

    static let primaryGradient = LinearGradient(
        colors: [purple, pink],
        startPoint: .leading,
        endPoint: .trailing
    )

    static let backgroundGradient = LinearGradient(
        colors: [bgA, bgB],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static func categoryColor(for parentCategory: String) -> Color {
        switch parentCategory {
        case "Income": Color(hex: "#39FF88")
        case "Car": Color(hex: "#33C7FF")
        case "Girlfriend": Color(hex: "#FF4DFF")
        case "Personal": Color(hex: "#FF4F7D")
        case "Expenses": Color(hex: "#C44DFF")
        case "Travel": Color(hex: "#FF9F1A")
        default: Color(hex: "#D8C5FF")
        }
    }

    static func categoryHex(for parentCategory: String) -> String {
        switch parentCategory {
        case "Income": "#39FF88"
        case "Car": "#33C7FF"
        case "Girlfriend": "#FF4DFF"
        case "Personal": "#FF4F7D"
        case "Expenses": "#C44DFF"
        case "Travel": "#FF9F1A"
        default: "#D8C5FF"
        }
    }
}

enum PulseFont {
    static func body(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let name: String
        switch weight {
        case .bold, .heavy, .black:
            name = "SpaceGrotesk-Bold"
        case .medium, .semibold:
            name = "SpaceGrotesk-Medium"
        default:
            name = "SpaceGrotesk-Regular"
        }
        return .custom(name, size: size)
    }

    static func heading(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        let name = weight == .medium ? "Fraunces-Medium" : "Fraunces-Bold"
        return .custom(name, size: size)
    }
}

extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)

        let red, green, blue, alpha: Double
        switch cleaned.count {
        case 6:
            red = Double((value >> 16) & 0xFF) / 255
            green = Double((value >> 8) & 0xFF) / 255
            blue = Double(value & 0xFF) / 255
            alpha = 1
        case 8:
            red = Double((value >> 24) & 0xFF) / 255
            green = Double((value >> 16) & 0xFF) / 255
            blue = Double((value >> 8) & 0xFF) / 255
            alpha = Double(value & 0xFF) / 255
        default:
            red = 1
            green = 1
            blue = 1
            alpha = 1
        }

        self.init(.sRGB, red: red, green: green, blue: blue, opacity: alpha)
    }
}

struct PulseBackground: View {
    var body: some View {
        ZStack {
            PulseTheme.backgroundGradient
                .ignoresSafeArea()

            Circle()
                .fill(PulseTheme.pink)
                .frame(width: 360, height: 360)
                .blur(radius: 80)
                .opacity(0.45)
                .offset(x: 140, y: -260)

            Circle()
                .fill(PulseTheme.purple)
                .frame(width: 280, height: 280)
                .blur(radius: 80)
                .opacity(0.45)
                .offset(x: -140, y: 320)
        }
    }
}

struct PulseCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(16)
            .background(PulseTheme.surface, in: RoundedRectangle(cornerRadius: PulseTheme.radius))
            .overlay {
                RoundedRectangle(cornerRadius: PulseTheme.radius)
                    .stroke(PulseTheme.line.opacity(0.8), lineWidth: 1)
            }
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var isEnabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(PulseFont.body(15, weight: .bold))
            .foregroundStyle(isEnabled ? Color.black : PulseTheme.textMuted)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background {
                RoundedRectangle(cornerRadius: 12)
                    .fill(
                        isEnabled
                            ? AnyShapeStyle(PulseTheme.primaryGradient)
                            : AnyShapeStyle(Color.white.opacity(0.08))
                    )
            }
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct GhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(PulseFont.body(14, weight: .medium))
            .foregroundStyle(PulseTheme.textMain)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color(hex: "#1D1736"), in: RoundedRectangle(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(PulseTheme.line, lineWidth: 1)
            }
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct DangerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(PulseFont.body(14, weight: .medium))
            .foregroundStyle(Color(hex: "#FFB8C5"))
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color(hex: "#2A0F17"), in: RoundedRectangle(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color(hex: "#5A2230"), lineWidth: 1)
            }
    }
}

struct PulseTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<_Label>) -> some View {
        configuration
            .font(PulseFont.body(15))
            .foregroundStyle(PulseTheme.textMain)
            .padding(12)
            .background(Color(hex: "#120F22"), in: RoundedRectangle(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color(hex: "#43386D"), lineWidth: 1)
            }
    }
}

struct MetricCard: View {
    let title: String
    let value: String
    var valueColor: Color = PulseTheme.textMain

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(PulseFont.body(13))
                .foregroundStyle(PulseTheme.textMuted)
            Text(value)
                .font(PulseFont.heading(24))
                .foregroundStyle(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(PulseTheme.surfaceStrong.opacity(0.85), in: RoundedRectangle(cornerRadius: PulseTheme.radius))
        .overlay {
            RoundedRectangle(cornerRadius: PulseTheme.radius)
                .stroke(PulseTheme.line.opacity(0.7), lineWidth: 1)
        }
    }
}

struct TypeChip: View {
    let type: TransactionType

    var body: some View {
        Text(type.label)
            .font(PulseFont.body(12, weight: .bold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(type == .income ? Color(hex: "#0E3320") : Color(hex: "#33111C"), in: Capsule())
            .foregroundStyle(type == .income ? PulseTheme.green : PulseTheme.red)
    }
}

struct CategoryChip: View {
    let parentCategory: String

    var body: some View {
        Text(parentCategory)
            .font(PulseFont.body(12, weight: .bold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(PulseTheme.categoryColor(for: parentCategory).opacity(0.15), in: Capsule())
            .foregroundStyle(PulseTheme.categoryColor(for: parentCategory))
    }
}

struct PulseStatusBanner: View {
    let message: String
    let isError: Bool

    var body: some View {
        Text(message)
            .font(PulseFont.body(13, weight: .medium))
            .foregroundStyle(isError ? PulseTheme.red : PulseTheme.green)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 4)
    }
}

struct SectionHeading: View {
    let title: String

    var body: some View {
        Text(title)
            .font(PulseFont.heading(22))
            .foregroundStyle(PulseTheme.textMain)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct EmptyStateView: View {
    let message: String

    var body: some View {
        Text(message)
            .font(PulseFont.body(14))
            .foregroundStyle(PulseTheme.textMuted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
    }
}

struct PulseToolbarMenu<Content: View>: View {
    let title: String
    let content: Content

    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        Menu {
            content
        } label: {
            Text(title)
                .font(PulseFont.body(14, weight: .medium))
                .foregroundStyle(PulseTheme.textMain)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(hex: "#1D1736"), in: RoundedRectangle(cornerRadius: 12))
                .overlay {
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(PulseTheme.line, lineWidth: 1)
                }
        }
    }
}

extension Double {
    var currencyString: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: self)) ?? "$0.00"
    }

    var percentString: String {
        "\(Int((self * 100).rounded()))%"
    }
}

extension String {
    var escapedForCSV: String {
        if contains(",") || contains("\"") || contains("\n") {
            return "\"\(replacingOccurrences(of: "\"", with: "\"\""))\""
        }
        return self
    }
}
