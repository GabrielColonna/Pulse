import XCTest

final class PulseUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
    }

    func testUnlockAndOpenQuickAdd() throws {
        launchForPINTests()
        XCTAssertTrue(app.staticTexts["Pulse"].waitForExistence(timeout: 5))
        enterPIN(["0", "3", "0", "7"])

        XCTAssertTrue(app.buttons["quickAddButton"].waitForExistence(timeout: 10))
        app.buttons["quickAddButton"].tap()
        XCTAssertTrue(app.navigationBars["Quick Add"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.textFields["transactionDescription"].exists)
        XCTAssertTrue(app.textFields["transactionAmount"].exists)
    }

    func testIncorrectPINShowsError() throws {
        launchForPINTests()
        enterPIN(["1", "1", "1", "1"])
        app.buttons["unlockButton"].tap()
        XCTAssertTrue(app.staticTexts["Incorrect PIN. Try Again."].waitForExistence(timeout: 2))
    }

    func testDashboardLoadsAfterUnlock() throws {
        launchUnlocked()
        XCTAssertTrue(app.buttons["quickAddButton"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Yearly Summary"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Monthly Summary"].exists)
        XCTAssertTrue(app.staticTexts["Category Chart"].exists)
    }

    private func launchForPINTests() {
        app.launchArguments = []
        app.launch()
    }

    private func launchUnlocked() {
        app.launchArguments = ["-uiTesting"]
        app.launch()
    }

    private func enterPIN(_ digits: [String]) {
        for (index, digit) in digits.enumerated() {
            let field = app.secureTextFields["pinDigit\(index)"]
            XCTAssertTrue(field.waitForExistence(timeout: 2))
            field.tap()
            field.typeText(digit)
        }
    }
}
