import json
import jinja2

version = '7.2'

with open(f'exam_schema.{version}.json') as f:
    schema = json.loads(f.read())

jinja_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader('templates'),
    block_start_string = '{%-',
    block_end_string = '-%}'
)

ids = {}

def get_ids(schema):
    if '$id' in schema:
        ids[schema['$id']] = schema

    t = schema.get('type')
    if t == 'object':
        for k,p in schema.get('properties',{}).items():
            get_ids(p)
        additional_properties = schema.get('additionalProperties',{})
        if additional_properties:
            get_ids(additional_properties)
    if t == 'array':
        items = schema.get('items',{})
        if items:
            get_ids(items)
        for i in schema.get('prefixItems',[]):
            get_ids(i)

get_ids(schema)

def resolve_id(ref):
    url, path = ref.split('#')
    if url == '':
        s = schema
    else:
        s = ids[url]
    bits = path.split('/')
    for b in bits:
        if b == '':
            continue
        s = s[b]
    key = bits[-1]
    return (f'defs-{key}', s.get('title',key))

def python_to_json(v):
    return json.dumps(v)

def items(s):
    return s.get('items')

jinja_env.filters['resolve_id'] = resolve_id
jinja_env.filters['python_to_json'] = python_to_json
jinja_env.filters['items'] = items

context = {
    'version': version,
    'schema': schema,
}

template = jinja_env.get_template('base.html')
output = template.render(context)

with open('index.html','w') as f:
    f.write(output)
