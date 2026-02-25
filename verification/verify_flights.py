from playwright.sync_api import sync_playwright, expect
import time

def verify_flight_simulation(page):
    print("Navigating to Flight Simulation...")
    # Use the URL parameter to launch directly into Flight Ops
    page.goto("http://localhost:8080/Arcade.html?sim=flight")

    # Wait for the flight count element to appear
    print("Waiting for UI...")
    flight_count_locator = page.locator("#flight-count")
    expect(flight_count_locator).to_be_visible(timeout=10000)

    # Wait for flights to be fetched and count to update (be > 0)
    print("Waiting for flight data...")
    # Use a custom wait logic or expect text to change
    # It starts at "0". We expect it to NOT be "0" eventually.
    expect(flight_count_locator).not_to_have_text("0", timeout=30000)

    # Get the count for logging
    count_text = flight_count_locator.inner_text()
    print(f"Flight count: {count_text}")

    # Wait a bit for the scene to render fully (instances to appear)
    page.wait_for_timeout(2000)

    # Take a screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/flight_simulation.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_flight_simulation(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_screenshot.png")
            raise e
        finally:
            browser.close()
