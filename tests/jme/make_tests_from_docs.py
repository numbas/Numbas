from docutils.parsers import rst

from collections import OrderedDict
from docutils import nodes
from docutils.parsers.rst import Directive, directives, roles
from docutils.parsers.rst.directives import body, misc, flag
from docutils.parsers import rst
import docutils
import io
from docutils.nodes import NodeVisitor
from json import dumps


class JMEFunction(nodes.container):
    pass

class JMEFunctionDirective(Directive):

    required_arguments = 0
    optional_arguments = 0
    final_argument_whitespace = True
    option_spec = {'op': str, 'keywords': str, 'noexamples': flag}
    has_content = True

    def run(self):
        # Raise an error if the directive does not have contents.
        self.assert_has_content()
        text = '\n'.join(self.content)
        # Create the admonition node, to be populated by `nested_parse`.
        name = self.options.get('op')
        calling_patterns = []
        for line in self.content:
            line = line.strip()
            if line == '':
                break
            calling_patterns.append(line)
#        if self.options.get('keywords') is None:
#            import sys
#            sys.stdout.write(self.content[0]+'\n')
        keywords = [x.strip() for x in self.options.get('keywords','').split(',')]
        noexamples = 'noexamples' in self.options
        if name is None:
            name = self.content[0]
            if '(' in name:
                name = name[:name.find('(')]
        node = JMEFunction(rawsource=text, fn_name=name, fn_keywords=keywords, fn_calling_patterns=calling_patterns, fn_noexamples=noexamples)
        # Parse the directive contents.
        self.state.nested_parse(self.content, self.content_offset,
                                node)
        return [node]
    
class notest(nodes.Inline, nodes.TextElement):
    tagname = 'notest'
    
    pass

def notest_role(role, rawtext, text, lineno, inliner, options={}, content=[]):
    roles.set_classes(options)
    i = rawtext.find('`')
    text = rawtext.split('`')[1]
    node = notest(rawtext, text, **options)
    return [node], []

class Role(misc.Role):

    def run(self):
        """Dynamically create and register a custom interpreted text role."""
        if self.content_offset > self.lineno or not self.content:
            raise self.error('"%s" directive requires arguments on the first '
                             'line.' % self.name)
        args = self.content[0]
        match = self.argument_pattern.match(args)
        if not match:
            raise self.error('"%s" directive arguments not valid role names: '
                             '"%s".' % (self.name, args))
        new_role_name = match.group(1)
        if new_role_name == 'no-test':
            return []
        return super().run()

    
directives.register_directive('role', Role)
directives.register_directive('jme:function', JMEFunctionDirective)
directives.register_directive('no-test', notest)
roles.register_local_role('no-test', notest_role)
#directives.register_directive('todo', body.Container)
#directives.register_directive('data', body.Container)
#roles.register_canonical_role('data', roles.code_role)
#roles.register_canonical_role('func', roles.code_role)
#roles.register_canonical_role('ref', roles.code_role)
#roles.register_canonical_role('jme:func', roles.code_role)

def is_example(node):
    for v in node.traverse():
        if isinstance(v,nodes.Text) and 'Example' in v:
            return True
    return False

def grab_text(node):
    t = ''
    for n in node.traverse():
        if isinstance(n,nodes.Text):
            t += n
    return t

class PrintVisitor(NodeVisitor):
    indent = 0
    def visit_Text(self, node):
        print(self.indent*' '+node)
    def depart_Text(self, node):
        pass
    def unknown_visit(self, node):
        print(self.indent*' '+'<'+node.tagname+'>')
        self.indent += 3
    def unknown_departure(self, node):
        self.indent -= 3
        print(self.indent*' '+'</'+node.tagname+'>')
        
class SimpleNodeVisitor(NodeVisitor):
    def unknown_visit(self,node):
        pass
            
    def unknown_departure(self,node):
        pass

class ExampleVisitor(SimpleNodeVisitor):
    expr = None
    has_output = False
    output = None
    notest = False
    
    def __init__(self,*args,**kwargs):
        self.examples = []
        super().__init__(*args,**kwargs)
    
    def visit_list_item(self, node):
        self.expr = None
        self.has_output = False
        self.output = None
        self.notest = False
        
    def depart_list_item(self, node):
        if self.expr and self.has_output and self.output and not self.notest:
            self.examples.append(OrderedDict([('in', self.expr), ('out', self.output)]))
        
    def visit_literal(self, node):
        if not self.expr:
            self.expr = grab_text(node)
        elif not self.output:
            self.output = grab_text(node)
        
    def visit_Text(self, node):
        if '→' in node:
            self.has_output = True
        
    def visit_notest(self, node):
        self.notest = True
    
class GetTitleVisitor(SimpleNodeVisitor):
    title = None
    
    def visit_title(self,node):
        if not self.title:
            self.title = grab_text(node)
    
class MyVisitor(SimpleNodeVisitor):
    current_function = None
    fns = []
    examples = []
    section = None
    sections = []
    
    def visit_section(self,node):
        gtv = GetTitleVisitor(self.document)
        node.walk(gtv)
        self.section = gtv.title
        
    def depart_section(self,node):
        if self.fns:
            #print(self.section,len(self.fns))
            self.sections.append(OrderedDict([('name', self.section), ('fns', self.fns)]))
        self.section = None
        self.fns = []

    def visit_JMEFunction(self, node: docutils.nodes.reference) -> None:
        self.examples = []
        self.current_function = {
            'name': node.attributes.get('fn_name'),
            'keywords': node.attributes.get('fn_keywords',[]),
            'noexamples': node.attributes.get('fn_noexamples',False),
            'calling_patterns': node.attributes.get('fn_calling_patterns',[]),
        }
            
    def depart_JMEFunction(self, node):
        if self.current_function:
            self.current_function.update({'examples': self.examples})
            self.fns.append(self.current_function)
        self.current_function = None
        self.examples = []
            
    def visit_definition_list_item(self, node):
        if self.current_function:
            if is_example(node):
                ev = ExampleVisitor(self.document)
                node.walkabout(ev)
                self.examples += ev.examples
    
import sys

source = sys.stdin.buffer.read().decode("utf8")

parser = rst.Parser()
opts = docutils.frontend.OptionParser(
                    components=(docutils.parsers.rst.Parser,)
                    )
settings = opts.get_default_values()
warning_stream = io.StringIO("")
settings.update({'warning_stream': warning_stream},opts)
document = docutils.utils.new_document(source, settings)
res = parser.parse(source, document)
warnings = warning_stream.getvalue()
"""
lines = warnings.split('\n')
bads = [l for l in lines if len(l) and l[0]==':']
if bads:
    print("Warnings:")
    print('\n'.join(bads))
"""
v = MyVisitor(document)
document.walkabout(v)

print(dumps(v.sections,indent=4))
