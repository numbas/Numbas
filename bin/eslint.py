import json
from pathlib import Path
import subprocess
import time
import sys

def run_eslint(files):
    r = subprocess.run(['npx','eslint','-f','json']+files, capture_output=True, encoding='utf-8')
    data = json.loads(r.stdout)
    return data

def show_result(item):
    print(item['filePath'])
    for message in item['messages']:
        try:
            if message['ruleId'] is None:
                message['ruleId'] = ''
            print('{line:>5}:{column:<3}\t{ruleId:<40}\t{message}'.format(**message))
        except TypeError as e:
            print(message)
            raise e


def main():
    files = sys.argv[1:]
    data = run_eslint(files)
    for item in data:
        messages = item['messages']
        if messages:
            show_result(item)
            while True:
                path = Path(item['filePath'])
                t1 = path.stat().st_mtime
                while True:
                    time.sleep(0.5)
                    try:
                        t2 = path.stat().st_mtime
                    except FileNotFoundError:
                        continue
                    if t2 > t1:
                        break

                item_data = run_eslint([item['filePath']])
                item = item_data[0]
                if item['messages']:
                    show_result(item)
                else:
                    print(f"\n{path} is done!\n")
                    break
main()
