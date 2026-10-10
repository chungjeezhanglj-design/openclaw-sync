#!/usr/bin/env python3
"""
Script to scrape investment project data from Hebei government website.
"""

import requests
import json
import re
from bs4 import BeautifulSoup

BASE_URL = "http://tzxm.hbzwfw.gov.cn/tzxm/gsxxList"
PARAMS = {"xzqh": "130000"}

def extract_data(html_content):
    """Extract data from HTML content."""
    soup = BeautifulSoup(html_content, 'html.parser')
    data = []
    
    # Find all table rows with data
    rows = soup.find_all('tr')
    for row in rows[1:]:  # Skip header row
        cells = row.find_all('td')
        if len(cells) >= 6:
            code = cells[0].get_text(strip=True)
            # Check if this looks like a project code
            if re.match(r'\d{4}-\d{6}-\d{2}-\d{2}-\d{6}', code):
                data.append({
                    "code": code,
                    "name": cells[1].get_text(strip=True),
                    "item": cells[2].get_text(strip=True),
                    "dept": cells[3].get_text(strip=True),
                    "result": cells[4].get_text(strip=True),
                    "date": cells[5].get_text(strip=True)
                })
    
    return data

def main():
    all_data = []
    
    print("Starting data extraction...")
    
    # Try to extract from the first page
    print("Fetching page 1...")
    response = requests.get(BASE_URL, params=PARAMS)
    response.encoding = 'utf-8'
    
    if response.status_code == 200:
        page_data = extract_data(response.text)
        print(f"Found {len(page_data)} records on page 1")
        all_data.extend(page_data)
    
    # Save current data
    with open('/Users/zhanglj/.openclaw/gsxx_data.json', 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    print(f"Total records saved: {len(all_data)}")
    print("Data saved to /Users/zhanglj/.openclaw/gsxx_data.json")

if __name__ == "__main__":
    main()
