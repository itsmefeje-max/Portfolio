from playwright.sync_api import sync_playwright

def verify_feature(page):
  page.goto("http://localhost:8000/Arcade.html")
  page.wait_for_timeout(2000)

  # Click the Solar System Simulation
  page.locator('.hub-card[data-sim="solar"]').click()
  page.wait_for_timeout(2000)

  # Take a screenshot of the solar system
  page.screenshot(path="verification/solar2.png")
  page.wait_for_timeout(1000)

  # Click Earth
  page.locator('button[data-target="Earth"]').click()
  page.wait_for_timeout(4000)

  # Take a screenshot focused on Earth
  page.screenshot(path="verification/earth2.png")
  page.wait_for_timeout(1000)

if __name__ == "__main__":
  import os
  os.makedirs("verification/video", exist_ok=True)
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(record_video_dir="verification/video")
    page = context.new_page()
    try:
      verify_feature(page)
    finally:
      context.close()
      browser.close()
