#!/usr/bin/env python3

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


import datetime
import os
import io
import sys
import traceback
import shutil
from optparse import OptionParser
import examparser
from exam import Exam,ExamError
import xml2js
from zipfile import ZipFile, ZipInfo
import xml.etree.ElementTree as etree
from itertools import count
import subprocess
import json
import jinja2


namespaces = {
    '': 'http://www.imsglobal.org/xsd/imscp_v1p1',
    'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'adlcp': 'http://www.adlnet.org/xsd/adlcp_v1p3',
    'adlseq': 'http://www.adlnet.org/xsd/adlseq_v1p3',
    'adlnav': 'http://www.adlnet.org/xsd/adlnav_v1p3',
    'imsss': 'http://www.imsglobal.org/xsd/imsss',
}

# because pre-py3.2 versions of etree always put a colon in front of tag names
# from http://stackoverflow.com/questions/8113296/supressing-namespace-prefixes-in-elementtree-1-2
if etree.VERSION[0:3] == '1.2':
    #in etree < 1.3, this is a workaround for supressing prefixes

    def fixtag(tag, namespaces):
        import string
        # given a decorated tag (of the form {uri}tag), return prefixed
        # tag and namespace declaration, if any
        if isinstance(tag, etree.QName):
            tag = tag.text
        namespace_uri, tag = tag[1:].split("}", 1)
        prefix = namespaces.get(namespace_uri)
        if namespace_uri not in namespaces:
            prefix = etree._namespace_map.get(namespace_uri)
            if namespace_uri not in etree._namespace_map:
                prefix = "ns%d" % len(namespaces)
            namespaces[namespace_uri] = prefix
            if prefix == "xml":
                xmlns = None
            else:
                if prefix is not None:
                    nsprefix = ':' + prefix
                else:
                    nsprefix = ''
                xmlns = ("xmlns%s" % nsprefix, namespace_uri)
        else:
            xmlns = None
        if prefix is not None:
            prefix += ":"
        else:
            prefix = ''

        return "%s%s" % (prefix, tag), xmlns

    etree.fixtag = fixtag
    for ns,url in namespaces.items():
        etree._namespace_map[url] = ns if len(ns) else None
else:
    #For etree > 1.3, use register_namespace function
    for ns,url in namespaces.items():
        try:
            etree.register_namespace(ns,url)        
        except AttributeError:
            etree._namespace_map[url]=ns


try:
    basestring
except NameError:
    basestring = str

def realFile(file):
    """
        Filter out temporary files created by vim
    """
    return not (file[-1]=='~' or file[-4:]=='.swp')


class CompileError(Exception):
    def __init__(self, message, stdout='', stderr='', code=0):
        super(CompileError, self).__init__()
        self.message = message
    def __str__(self):
        return 'Compilation error: {}'.format(self.message)

class NumbasCompiler(object):
    def __init__(self,options):
        self.options = options
        self.get_themepaths()

    def get_themepaths(self):
        self.themepaths = [self.options.theme]
        for theme,i in zip(self.themepaths,count()):
            theme = self.themepaths[i] = self.get_theme_path(theme)
            inherit_file = os.path.join(theme,'inherit.txt')
            if os.path.exists(inherit_file):
                self.themepaths += open(inherit_file).read().splitlines()

        self.themepaths.reverse()

    def get_theme_path(self,theme):
        if os.path.exists(theme):
            return theme
        else:
            ntheme = os.path.join(self.options.path,'themes',theme)
            if os.path.exists(ntheme):
                return ntheme
            else:
                raise CompileError("Couldn't find theme %s" % theme)

    def compile(self):
        self.parse_exam()

        files = self.files = self.collect_files()

        self.render_templates()

        self.make_xml()
        files[os.path.join('.','settings.js')] = io.StringIO(self.xmls)

        files[os.path.join('.','marking_scripts.js')] = io.StringIO(self.collect_marking_scripts())

        self.make_locale_file()

        self.add_source()

        if self.options.scorm:
            self.add_scorm()

        self.collect_stylesheets()
        self.collect_scripts()

        if self.options.minify:
            self.minify()
            
        if self.options.zip:
            self.compileToZip()
        else:
            self.compileToDir()

    def parse_exam(self):
        """
            Parse an exam definition from the given source
        """
        try:
            self.exam = Exam.fromstring(self.options.source)
            self.examXML = self.exam.tostring()
            self.resources = self.exam.resources
            self.extensions = self.exam.extensions
        except ExamError as err:
            raise CompileError('Error constructing exam:\n%s' % err)
        except examparser.ParseError as err:
            raise CompileError("Failed to compile exam due to parsing error.\n%s" % err)
        except:
            raise CompileError('Failed to compile exam.')

    def collect_files(self,dirs=[('runtime','.')]):
        """
            Collect files from the given directories to be included in the compiled package
        """
        resources = [x if isinstance(x,list) else [x,x] for x in self.resources]

        for name,path in resources:
            if os.path.isdir(path):
                dirs.append((os.path.join(self.options.path,path),os.path.join('resources',name)))

        extensions = [os.path.join(self.options.path,'extensions',x) for x in self.extensions]
        extfiles = []
        for x in extensions:
            if os.path.isdir(x):
                extfiles.append((os.path.join(os.getcwd(),x),os.path.join('extensions',os.path.split(x)[1])))
            else:
                raise CompileError("Extension {} not found".format(x))
        dirs += extfiles

        for themepath in self.themepaths:
            dirs.append((os.path.join(themepath,'files'),'.'))

        files = {}
        for (src,dst) in dirs:
            src = os.path.join(self.options.path,src)
            for x in os.walk(src, followlinks=self.options.followlinks):
                xsrc = x[0]
                xdst = x[0].replace(src,dst,1)
                for y in filter(realFile,x[2]):
                    files[os.path.join(xdst,y)] = os.path.join(xsrc,y) 

        for name,path in resources:
            if not os.path.isdir(path):
                files[os.path.join('resources',name)] = os.path.join(self.options.path,path)
        
        return files

    def collect_marking_scripts(self):
        scripts_dir = os.path.join(self.options.path,'marking_scripts')
        scripts = {}
        for filename in os.listdir(scripts_dir):
            name, ext = os.path.splitext(filename)
            if ext=='.jme':
                with open(os.path.join(scripts_dir,filename)) as f:
                    scripts[name] = f.read()
        template = """Numbas.queueScript('marking_scripts',['marking'],function() {{
            Numbas.marking_scripts = {scripts};
            for(var x in Numbas.marking_scripts) {{
                Numbas.marking_scripts[x] = new Numbas.marking.MarkingScript(Numbas.marking_scripts[x]);
            }}
        }});
        """

        return template.format(scripts = json.dumps(scripts))

    def make_xml(self):
        """
            Write the javascript representation of the XML files (theme XSLT and exam XML)
        """
        xslts = {}
        for themedir in self.themepaths:
            xsltdir = os.path.join(themedir,'xslt')

            if os.path.exists(xsltdir):
                files = filter(lambda x: x[-5:]=='.xslt', os.listdir(xsltdir))
                for file in files:
                    name, ext = os.path.splitext(file)
                    xslts[name] = xml2js.encode(open(os.path.join(xsltdir,file),encoding='utf-8').read())

        if 'question' not in xslts and self.question_xslt is not None:
            xslts['question'] = xml2js.encode(self.question_xslt)

        xslts_js = ',\n\t\t'.join('{}: "{}"'.format(name,body) for name,body in xslts.items())

        extensionfiles = []
        for extension in self.extensions:
            name = os.path.split(extension)[1]
            if os.path.exists(os.path.join(extension,name+'.js')):
                extensionfiles.append('extensions/'+name+'/'+name+'.js')

        self.xmls = xml2js.rawxml_js_template.format(**{
            'extensionfiles': str(extensionfiles),
            'templates': xslts_js,
            'examXML': xml2js.encode(self.examXML),
        })

    def render_templates(self):
        """
            Render index.html using the theme templates
        """
        template_paths = [os.path.join(path,'templates') for path in self.themepaths]
        template_paths.reverse()

        self.template_environment = jinja2.Environment(loader=jinja2.FileSystemLoader(template_paths))
        index_dest = os.path.join('.','index.html')
        if index_dest not in self.files:
            index_html = self.render_template('index.html')
            if index_html:
                self.files[index_dest] = io.StringIO(index_html)
            else:
                if self.options.expect_index_html:
                    raise CompileError("The theme has not produced an index.html file. Check that the `templates` and `files` folders are at the top level of the theme package.")
        self.question_xslt = self.render_template('question.xslt')

    def render_template(self,name):
        try:
            template = self.template_environment.get_template(name)
            output = template.render({'exam': self.exam,'options': self.options})
            return output
        except jinja2.exceptions.TemplateNotFound:
            return None
        except jinja2.exceptions.TemplateSyntaxError as e:
            raise CompileError('Error in theme template: jinja syntax error on line {} of {}: {}\n\n'.format(e.lineno,e.name,e.message))

    def make_locale_file(self):
        """
            Make locale.js using the selected locale file
        """
        localePath = os.path.join(self.options.path,'locales')
        locales = {}
        for fname in os.listdir(localePath):
            name,ext = os.path.splitext(fname)
            if ext.lower()=='.json':
                with open(os.path.join(localePath,fname),encoding='utf-8') as f:
                    locales[name.lower()] = {'translation': json.loads(f.read())}

        locale_js_template = """
        Numbas.queueScript('localisation-resources',['i18next'],function() {{
        Numbas.locale = {{
            preferred_locale: {},
            resources: {}
        }}
        }});
        """
        locale_js = locale_js_template.format(json.dumps(self.options.locale),json.dumps(locales))

        self.files[os.path.join('.','locale.js')] = io.StringIO(locale_js)

    def add_scorm(self):
        """
            Add the necessary files for the SCORM protocol to the package
        """

        self.files.update(self.collect_files([('scormfiles','.')]))

        IMSprefix = '{http://www.imsglobal.org/xsd/imscp_v1p1}'
        manifest = etree.fromstring(open(os.path.join(self.options.path,'scormfiles','imsmanifest.xml')).read())
        manifest.attrib['identifier'] = 'Numbas: %s' % self.exam.name
        manifest.find('%sorganizations/%sorganization/%stitle' % (IMSprefix,IMSprefix,IMSprefix)).text = self.exam.name
        def to_relative_url(path):
            path = os.path.normpath(path)
            bits = []
            head,tail=os.path.split(path)
            while head!='':
                bits.insert(0,tail)
                head,tail=os.path.split(head)
            bits.insert(0,tail)
            return '/'.join(bits)

        resource_files = [to_relative_url(x) for x in self.files.keys()]

        resource_element = manifest.find('%sresources/%sresource' % (IMSprefix,IMSprefix))
        for filename in resource_files:
            file_element = etree.Element('file')
            file_element.attrib = {'href': filename}
            resource_element.append(file_element)

        manifest_string = etree.tostring(manifest)
        try:
            manifest_string = manifest_string.decode('utf-8')
        except AttributeError:
            pass

        self.files[os.path.join('.','imsmanifest.xml')] = io.StringIO(manifest_string)

    def collect_stylesheets(self):
        """
            Collect together all CSS files and compile them into a single file, styles.css
        """
        stylesheets = [(dst,src) for dst,src in self.files.items() if os.path.splitext(dst)[1]=='.css']
        stylesheets.sort(key=lambda x:x[0])
        for dst,src in stylesheets:
            del self.files[dst]
        stylesheets = [src for dst,src in stylesheets]
        stylesheets = '\n'.join(open(src,encoding='utf-8').read() if isinstance(src,basestring) else src.read() for src in stylesheets)
        self.files[os.path.join('.','styles.css')] = io.StringIO(stylesheets)

    def collect_scripts(self):
        """
            Collect together all Javascript files and compile them into a single file, scripts.js
        """
        javascripts = [(dst,src) for dst,src in self.files.items() if os.path.splitext(dst)[1]=='.js']
        for dst,src in javascripts:
            del self.files[dst]

        javascripts.sort(key=lambda x:x[0])

        javascripts = [src for dst,src in javascripts]
        numbas_loader_path = os.path.join(self.options.path,'runtime','scripts','numbas.js')
        javascripts.remove(numbas_loader_path)

        javascripts.insert(0,numbas_loader_path)
        javascripts = '\n'.join(open(src,encoding='utf-8').read() if isinstance(src,basestring) else src.read() for src in javascripts)
        self.files[os.path.join('.','scripts.js')] = io.StringIO(javascripts)

    def add_source(self):
        """
        	Add the original .exam file, so that it can be recreated later on
        """
        self.files[os.path.join('.','source.exam')] = io.StringIO(self.options.source)

    def minify(self):
        """
            Minify all javascript files in the package
        """
        for dst,src in self.files.items():
            if isinstance(src,basestring) and os.path.splitext(dst)[1] == '.js':
                p = subprocess.Popen([self.options.minify,src],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
                out,err = p.communicate()
                code = p.poll()
                if code != 0:
                    raise CompileError('Failed to minify %s with minifier %s' % (src,self.options.minify))
                else:
                    self.files[dst] = io.StringIO(out.decode('utf-8'))

    def compileToZip(self):
        """ 
            Compile the exam as a .zip file
        """
        def cleanpath(path):
            if path=='': 
                return ''
            dirname, basename = os.path.split(path)
            dirname=cleanpath(dirname)
            if basename!='.':
                dirname = os.path.join(dirname,basename)
            return dirname

        f = ZipFile(self.options.output,'w')

        for (dst,src) in self.files.items():
            dst = ZipInfo(cleanpath(dst))
            dst.external_attr = 0o644<<16
            dst.date_time = datetime.datetime.today().timetuple()
            if isinstance(src,basestring):
                f.writestr(dst,open(src,'rb').read())
            else:
                f.writestr(dst,src.read())

        print("Exam created in %s" % os.path.relpath(self.options.output))

        f.close()

    def compileToDir(self):
        """
            Compile the exam as a directory on the filesystem
        """
        if self.options.action == 'clean':
            try:
                shutil.rmtree(self.options.output)
            except OSError:
                pass
        try:
            os.mkdir(self.options.output)
        except OSError:
            pass
        
        def makepath(path):    #make sure directory hierarchy of path exists by recursively creating directories
            dir = os.path.dirname(path)
            if not os.path.exists(dir):
                makepath(dir)
                try:
                    os.mkdir(dir)
                except OSError:
                    pass

        for (dst,src) in self.files.items():
            dst = os.path.join(self.options.output,dst)
            makepath(dst)
            if isinstance(src,basestring):
                if self.options.action=='clean' or not os.path.exists(dst) or os.path.getmtime(src)>os.path.getmtime(dst):
                    shutil.copyfile(src,dst)
            else:
                shutil.copyfileobj(src,open(dst,'w',encoding='utf-8'))
        
        print("Exam created in %s" % os.path.relpath(self.options.output))

def run():
    parser = OptionParser(usage="usage: %prog [options] source")
    parser.add_option('-t','--theme',
                        dest='theme',
                        action='store',
                        type='string',
                        default='default',
                        help='Path to the theme to use'
        )
    parser.add_option('-f','--followlinks',
                        dest='followlinks',
                        action='store_true',
                        default=False,
                        help='Whether to follow symbolic links in the theme directories'
        )
    parser.add_option('-u','--update',
                        dest='action',
                        action='store_const',
                        const='update',
                        default='update',
                        help='Update an existing exam.'
        )
    parser.add_option('-c','--clean',
                        dest='action',
                        action='store_const',
                        const='clean',
                        help='Start afresh, deleting any existing exam in the target path'
        )
    parser.add_option('-z','--zip',
                        dest = 'zip',
                        action='store_true',
                        default=False,
                        help='Create a zip file instead of a directory'
        )
    parser.add_option('-s','--scorm',
                        dest='scorm',
                        action='store_true',
                        default=False,
                        help='Include the files necessary to make a SCORM package'
        )
    parser.add_option('-p','--path',
                        dest='path',
                        default=os.getcwd(),
                        help='The path to the Numbas files'
        )
    parser.add_option('-o','--output',
                        dest='output',
                        help='The target path'
        )
    parser.add_option('--pipein',
                        dest='pipein',
                        action='store_true',
                        default=False,
                        help="Read .exam from stdin")
    parser.add_option('-l','--language',
                        dest='locale',
                        default='en-GB',
                        help='Language (ISO language code) to use when displaying text')
    parser.add_option('--minify',
                        dest='minify',
                        default='',
                        help='Path to Javascript minifier. If not given, no minification is performed.')
    parser.add_option('--show_traceback',
                        dest='show_traceback',
                        action='store_true',
                        default=False,
                        help='Show the Python traceback in case of an error')
    parser.add_option('--no_index_html',
                        dest='expect_index_html',
                        action='store_false',
                        default=True,
                        help='Don\'t expect an index.html file to be produced')

    (options,args) = parser.parse_args()

    if options.pipein:
        options.source = sys.stdin.detach().read().decode('utf-8')
        if not options.output:
            options.output = os.path.join(path,'output','exam')
    else:
        try:
            source_path = args[0]
        except IndexError:
            parser.print_help()
            return

        if not os.path.exists(source_path):
            osource = source_path
            source_path = os.path.join(path,source_path)
            if not os.path.exists(source_path):
                print("Couldn't find source file %s" % osource)
                exit(1)
        options.source=open(source_path,encoding='utf-8').read()

        if not options.output:
            output = os.path.basename(os.path.splitext(source_path)[0])
            if options.zip:
                output += '.zip'
            options.output=os.path.join(options.path,'output',output)
    

    try:
        compiler = NumbasCompiler(options)
        compiler.compile()
    except Exception as err:
        sys.stderr.write(str(err)+'\n')
        _,_,exc_traceback = sys.exc_info()
        if options.show_traceback:
            sys.stderr.write('\n')
            traceback.print_exc()
        exit(1)

if __name__ == '__main__':
    run()

