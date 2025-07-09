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


def get_modified_time(file):
    path = Path(file)
    return path.stat().st_mtime

def main():
    files = sys.argv[1:]

    data = run_eslint(files)
    for item in data:
        messages = item['messages']
        if messages:
            show_result(item)

    times = {file: get_modified_time(file) for file in files}
    while True:
        for file in files:
            try:
                t2 = get_modified_time(file)
            except FileNotFoundError:
                continue
            if t2 > times[file]:
                times[file] = t2
                item_data = run_eslint([file])
                item = item_data[0]
                if item['messages']:
                    show_result(item)
                else:
                    print(f"\n{file} is done!\n")
                break

        time.sleep(0.5)
main()
