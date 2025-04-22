#Copyright 2011-16 Newcastle University
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.

import re

def encode(xml):
    xml = xml.strip()
    xml = re.sub('\r','',xml)
    xml = re.sub('\\\\','\\\\\\\\',xml)
    xml = re.sub('\n',r'\\n',xml)
    xml = re.sub('"','\\"',xml)
    return xml

settings_js_template = """Numbas.queueScript('settings',{extensionfiles},function() {{
    Numbas.custom_part_types = {custom_part_types};

    Numbas.version = {numbas_version};

    Numbas.rawxml = {{
        templates: {{
            {templates}
        }}
    }};
}});
"""
