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
from exam import ExamBuilder, ExamError
import examparser
import io
from itertools import count
import jinja2
import json
from optparse import OptionParser
import os
from pathlib import Path, PurePath
import shutil
import subprocess
import sys
import traceback
import xml.etree.ElementTree as etree
import xml2js
import zipfile
from zipfile import ZipFile, ZipInfo


NUMBAS_VERSION = '8.0'


namespaces = {
    '': 'http://www.imsglobal.org/xsd/imscp_v1p1',
    'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'adlcp': 'http://www.adlnet.org/xsd/adlcp_v1p3',
    'adlseq': 'http://www.adlnet.org/xsd/adlseq_v1p3',
    'adlnav': 'http://www.adlnet.org/xsd/adlnav_v1p3',
    'imsss': 'http://www.imsglobal.org/xsd/imsss',
}

#For etree > 1.3, use register_namespace function
for ns, url in namespaces.items():
    try:
        etree.register_namespace(ns, url)        
    except AttributeError:
        etree._namespace_map[url]=ns


def realFile(filename):
    """
        Filter out temporary files created by vim and hidden files
    """
    path = Path(filename)
    return not (path.name.endswith('~') or path.suffix=='.swp' or path.name.startswith('.'))


class CompileError(Exception):
    def __init__(self, message, stdout='', stderr='', code=0):
        super(CompileError, self).__init__()
        self.message = message
    def __str__(self):
        return 'Compilation error: {}'.format(self.message)

class NumbasCompiler(object):
    def __init__(self, options):
        self.options = options

        self.get_themepaths()

        self.minify_extensions = {
            '.js': self.options.minify_js, 
            '.css': self.options.minify_css,
        }

    def get_themepaths(self):
        self.themepaths = [self.options.theme]
        for theme, i in zip(self.themepaths, count()):
            theme = self.themepaths[i] = self.get_theme_path(theme)
            inherit_file = theme / 'inherit.txt'
            if inherit_file.exists():
                with open(inherit_file) as ifile:
                    self.themepaths += ifile.read().splitlines()

        self.themepaths.reverse()

    def get_theme_path(self, theme):
        path = Path(theme)
        if path.exists():
            return path
        else:
            ntheme = Path(self.options.path) / 'themes' / theme
            if ntheme.exists():
                return ntheme
            else:
                raise CompileError("Couldn't find theme %s" % theme)

    def compile(self):
        self.parse_exam()

        self.build_time = datetime.datetime.now()

        files = self.files = self.collect_files()

        self.render_templates()

        self.make_xml()
        files[PurePath('.', 'settings.js')] = io.StringIO(self.xmls)

        files[PurePath('.', 'marking_scripts.js')] = io.StringIO(self.collect_marking_scripts())
        files[PurePath('.', 'diagnostic_scripts.js')] = io.StringIO(self.collect_diagnostic_scripts())

        if self.options.source_url:
            files[PurePath('.', 'downloaded-from.txt')] = io.StringIO(self.options.source_url)

        self.make_locale_file()

        self.add_source()

        self.add_manifest()

        if self.options.scorm:
            self.add_scorm()

        self.collect_stylesheets()
        self.collect_scripts()

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
            builder = ExamBuilder()
            self.exam = builder.exam_from_string(self.options.source)
            self.examXML = self.exam.tostring()
            self.resources = self.exam.resources
            self.extensions = self.exam.extensions
            self.custom_part_types = self.exam.custom_part_types
        except ExamError as err:
            raise CompileError('Error constructing exam:\n%s' % err)
        except examparser.ParseError as err:
            raise CompileError("Failed to compile exam due to parsing error.\n%s" % err)
        except:
            raise CompileError('Failed to compile exam.')

    def collect_files(self, dirs=[('runtime', '.')]):
        """
            Collect files from the given directories to be included in the compiled package
        """
        resources = [x if isinstance(x, list) else [x, x] for x in self.resources]

        for name, path in resources:
            if Path(path).is_dir():
                dirs.append((Path(self.options.path) / path, PurePath('resources') / name))

        extensions = [Path(self.options.path) / 'extensions' / x for x in self.extensions]
        extfiles = []
        for x in extensions:
            if x.is_dir():
                extfiles.append((Path.cwd() / x, PurePath('extensions') / x.name))
            else:
                raise CompileError("Extension {} not found".format(x))
        dirs += extfiles

        for themepath in self.themepaths:
            dirs.append((themepath / 'files', PurePath('.')))

        files = {}
        for (src, dst) in dirs:
            src = Path(self.options.path) / src
            for path, dirnames, filenames in os.walk(src, followlinks=self.options.followlinks):
                xsrc = Path(path)
                xdst = dst / xsrc.relative_to(src)
                for filename in [f for f in filenames if realFile(f)]:
                    files[xdst / filename] = xsrc / filename
                hidden_dirnames = []
                for d in dirnames:
                    if d[0]=='.' and len(d)>1:
                        hidden_dirnames.append(d)
                for d in hidden_dirnames:
                    dirnames.remove(d)

        for name, path in resources:
            if not Path(path).is_dir():
                files[Path('resources') / name] = Path(self.options.path) / path
        
        return files

    def collect_marking_scripts(self):
        scripts_dir = Path(self.options.path) / 'marking_scripts'
        scripts = {}
        for filename in scripts_dir.iterdir():
            if filename.suffix == '.jme':
                with open(filename) as f:
                    scripts[filename.stem] = f.read()
        template = """Numbas.queueScript('marking_scripts', ['marking'], function() {{
            Numbas.raw_marking_scripts = {scripts};
        }});
        """

        return template.format(scripts = json.dumps(scripts))

    def collect_diagnostic_scripts(self):
        scripts_dir = Path(self.options.path) / 'diagnostic_scripts'
        scripts = {}
        for filename in scripts_dir.iterdir():
            if filename.suffix == '.jme':
                with open(filename) as f:
                    scripts[filename.stem] = f.read()
        template = """Numbas.queueScript('diagnostic_scripts', ['diagnostic', 'marking'], function() {{
            Numbas.raw_diagnostic_scripts = {scripts};
        }});
        """

        return template.format(scripts = json.dumps(scripts))

    def make_xml(self):
        """
            Write the javascript representation of the XML files (theme XSLT and exam XML)
        """
        xslts = {}
        if self.question_xslt is not None:
            xslts['question'] = xml2js.encode(self.question_xslt)
        if self.part_xslt is not None:
            xslts['part'] = xml2js.encode(self.part_xslt)

        xslts_js = ',\n\t\t'.join('{}: "{}"'.format(name, body) for name, body in xslts.items())

        extensionfiles = []
        for extension in self.extensions:
            path = Path(extension)
            if os.path.exists((path / path.name).with_suffix('.js')):
                extensionfiles.append(PurePath('extensions', path.name, path.name).with_suffix('.js'))

        custom_part_types = {}
        for pt in self.custom_part_types:
            custom_part_types[pt['short_name']] = pt

        self.xmls = xml2js.settings_js_template.format(**{
            'numbas_version': NUMBAS_VERSION,
            'extensionfiles': [str(x) for x in extensionfiles],
            'templates': xslts_js,
            'examXML': xml2js.encode(self.examXML),
            'custom_part_types': json.dumps(custom_part_types),
        })

    def render_templates(self):
        """
            Render index.html using the theme templates
        """
        template_paths = [path / 'templates' for path in self.themepaths]
        template_paths.reverse()

        self.template_environment = jinja2.Environment(loader=jinja2.FileSystemLoader(template_paths))

        index_dest = Path('.') / 'index.html'
        if index_dest not in self.files:
            index_html = self.render_template('index.html')
            if index_html:
                self.files[index_dest] = io.StringIO(index_html)
            else:
                if self.options.expect_index_html:
                    raise CompileError("The theme has not produced an index.html file. Check that the `templates` and `files` folders are at the top level of the theme package.")

        if self.exam.navigation['allowAttemptDownload']:
            analysis_dest = Path('.') / 'analysis.html'
            if analysis_dest not in self.files:
                analysis_html = self.render_template('analysis.html')
                if analysis_html:
                    self.files[analysis_dest] = io.StringIO(analysis_html)

        self.question_xslt = self.render_template('question.xslt')
        self.part_xslt = self.render_template('part.xslt')

    def render_template(self, name):
        try:
            template = self.template_environment.get_template(name)
            output = template.render({'exam': self.exam, 'options': self.options, 'build_time': self.build_time.timestamp()})
            return output
        except jinja2.exceptions.TemplateNotFound:
            return None
        except jinja2.exceptions.TemplateSyntaxError as e:
            raise CompileError('Error in theme template: jinja syntax error on line {} of {}: {}\n\n'.format(e.lineno, e.name, e.message))

    def make_locale_file(self):
        """
            Make locale.js using the selected locale file
        """
        localePath = Path(self.options.path) / 'locales'
        locales = {}
        for fname in localePath.iterdir():
            if fname.suffix == '.json':
                with open(fname, encoding='utf-8') as f:
                    locales[fname.stem.lower()] = {'translation': json.loads(f.read())}

        locale_js_template = """
        Numbas.queueScript('localisation-resources', ['i18next'], function() {{
        Numbas.locale = {{
            preferred_locale: {},
            resources: {}
        }}
        }});
        """
        locale_js = locale_js_template.format(json.dumps(self.options.locale), json.dumps(locales))

        self.files[PurePath('.') / 'locale.js'] = io.StringIO(locale_js)

    def add_scorm(self):
        """
            Add the necessary files for the SCORM protocol to the package
        """

        self.files.update(self.collect_files([('scormfiles', '.')]))

        IMSprefix = '{http://www.imsglobal.org/xsd/imscp_v1p1}'
        with open(Path(self.options.path) / 'scormfiles' / 'imsmanifest.xml') as f:
            manifest = etree.fromstring(f.read())
        manifest.attrib['identifier'] = 'Numbas: %s' % self.exam.name
        manifest.find('%sorganizations/%sorganization/%stitle' % (IMSprefix, IMSprefix, IMSprefix)).text = self.exam.name
        resource_files = [str(x) for x in self.files.keys()]

        resource_element = manifest.find('%sresources/%sresource' % (IMSprefix, IMSprefix))
        for filename in resource_files:
            file_element = etree.Element('file')
            file_element.attrib = {'href': filename}
            resource_element.append(file_element)

        manifest_string = etree.tostring(manifest)
        try:
            manifest_string = manifest_string.decode('utf-8')
        except AttributeError:
            pass

        self.files[PurePath('.') / 'imsmanifest.xml'] = io.StringIO(manifest_string)

    def collect_stylesheets(self):
        """
            Collect together all CSS files and compile them into a single file, styles.css
        """
        stylesheets = []
        for dst, src in self.files.items():
            if Path(dst).suffix != '.css':
                continue
            if not any(p.name == 'standalone_scripts' for p in Path(dst).parents):
                stylesheets.append((dst, src))

        stylesheets.sort(key=lambda x:x[0])
        for dst, src in stylesheets:
            del self.files[dst]
        stylesheets = [src for dst, src in stylesheets]
        stylesheets = '\n'.join(src.read_text(encoding='utf-8') if isinstance(src, Path) else src.read() for src in stylesheets)
        self.files[PurePath('.') / 'styles.css'] = io.StringIO(stylesheets)

    def collect_scripts(self):
        """
            Collect together all Javascript files and compile them into a single file, scripts.js
        """
        javascripts = []
        for dst, src in self.files.items():
            if Path(dst).suffix != '.js':
                continue
            if not any(p.name == 'standalone_scripts' for p in Path(dst).parents):
                javascripts.append((dst, src))

        for dst, src in javascripts:
            del self.files[dst]

        javascripts.sort(key=lambda x:x[0])

        javascripts = [src for dst, src in javascripts]
        numbas_loader_path = Path(self.options.path) / 'runtime' / 'scripts' / 'numbas.js'
        javascripts.remove(numbas_loader_path)

        javascripts.insert(0, numbas_loader_path)
        javascripts = ';\n'.join(src.read_text(encoding='utf-8') if isinstance(src, Path) else src.read() for src in javascripts)
        self.files[PurePath('.') / 'scripts.js'] = io.StringIO(javascripts)

    def add_source(self):
        """
        	Add the original .exam file, so that it can be recreated later on
        """
        self.files[PurePath('.') / 'source.exam'] = io.StringIO(self.options.source)

    def add_manifest(self):
        features = {
            'run_headless': True,
            'scorm': self.options.scorm,
            'has_index_html': self.options.expect_index_html,
        }
        manifest = {
            'Numbas_version': NUMBAS_VERSION,
            'source_url': self.options.source_url,
            'edit_url': self.options.edit_url,
            'locale': self.options.locale,
            'features': features,
        }
        self.files[PurePath('.') / 'numbas-manifest.json'] = io.StringIO(json.dumps(manifest))

    def minify(self):
        """
            Minify all files in the package with associated minifiers.
        """
        for dst, src in self.files.items():
            suffix = Path(dst).suffix
            minifier = self.minify_extensions.get(suffix)
            if minifier is not None:
                if isinstance(src, Path):
                    p = subprocess.Popen([minifier,src], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    out, err = p.communicate()
                elif isinstance(src, io.StringIO):
                    p = subprocess.Popen([minifier],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
                    out,err = p.communicate(src.read().encode())
                code = p.poll()
                if code != 0:
                    raise CompileError('Failed to minify %s with minifier %s' % (src, minifier))
                else:
                    self.files[dst] = io.StringIO(out.decode('utf-8'))

    def compileToZip(self):
        """ 
            Compile the exam as a .zip file
        """
        Path(self.options.output).parent.mkdir(exist_ok=True, parents=True)
        
        f = ZipFile(self.options.output, 'w')

        for (dst, src) in self.files.items():
            dst = ZipInfo(str(Path(dst).relative_to('.')))
            dst.compress_type = zipfile.ZIP_DEFLATED
            dst.external_attr = 0o644<<16
            dst.date_time = self.build_time.timetuple()
            if isinstance(src, Path):
                f.writestr(dst, src.read_bytes())
            else:
                f.writestr(dst, src.read())

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

        outpath = Path(self.options.output)

        outpath.mkdir(exist_ok=True,parents=True)
        
        for (dst, src) in self.files.items():
            dst = outpath / dst
            dst.parent.mkdir(exist_ok=True,parents=True)
            if isinstance(src, Path):
                if self.options.action=='clean' or not dst.exists() or src.stat().st_mtime > dst.stat().st_mtime:
                    shutil.copyfile(src, dst)
            else:
                shutil.copyfileobj(src, open(dst, 'w', encoding='utf-8'))
        
        print("Exam created in %s" % os.path.relpath(self.options.output))

def run():
    parser = OptionParser(usage="usage: %prog [options] source")
    parser.add_option('-t', '--theme',
                        dest='theme',
                        action='store',
                        type='string',
                        default='default',
                        help='Path to the theme to use'
        )
    parser.add_option('-f', '--followlinks',
                        dest='followlinks',
                        action='store_true',
                        default=False,
                        help='Whether to follow symbolic links in the theme directories'
        )
    parser.add_option('-u', '--update',
                        dest='action',
                        action='store_const',
                        const='update',
                        default='update',
                        help='Update an existing exam.'
        )
    parser.add_option('-c', '--clean',
                        dest='action',
                        action='store_const',
                        const='clean',
                        help='Start afresh, deleting any existing exam in the target path'
        )
    parser.add_option('-z', '--zip',
                        dest = 'zip',
                        action='store_true',
                        default=False,
                        help='Create a zip file instead of a directory'
        )
    parser.add_option('-s', '--scorm',
                        dest='scorm',
                        action='store_true',
                        default=False,
                        help='Include the files necessary to make a SCORM package'
        )
    parser.add_option('-p', '--path',
                        dest='path',
                        default=os.getcwd(),
                        help='The path to the Numbas files'
        )
    parser.add_option('-o', '--output',
                        dest='output',
                        help='The target path'
        )
    parser.add_option('--pipein',
                        dest='pipein',
                        action='store_true',
                        default=False,
                        help="Read .exam from stdin")
    parser.add_option('-l', '--language',
                        dest='locale',
                        default='en-GB',
                        help='Language (ISO language code) to use when displaying text')
    parser.add_option('--minify_js', '--minify',
                        dest='minify_js',
                        default=None,
                        help='Path to Javascript minifier. If not given, no minification is performed.')
    parser.add_option('--minify_css',
                        dest='minify_css',
                        default=None,
                        help='Path to CSS minifier. If not given, no minification is performed.')
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
    parser.add_option('--mathjax-url',
                        dest='mathjax_url',
                        default='https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0',
                        help='URL of MathJax')
    parser.add_option('--source-url',
                        dest='source_url',
                        help='URL from which this exam can be downloaded')
    parser.add_option('--edit-url',
                        dest='edit_url',
                        help='URL at which this exam can be edited')
    parser.add_option('--accessibility-statement-url',
                        dest='accessibility_statement_url',
                        default='https://docs.numbas.org.uk/en/latest/accessibility/exam.html',
                        help='URL of the user accessibility statement')

    (options, args) = parser.parse_args()

    if not options.output:
        raise CompileError("The output path was not given.")

    if options.pipein:
        options.source = sys.stdin.detach().read().decode('utf-8')
    else:
        try:
            source_path = Path(args[0])
        except IndexError:
            parser.print_help()
            return

        if not source_path.exists():
            print("Couldn't find source file %s" % osource)
            exit(1)

        with open(source_path, encoding='utf-8') as f:
            options.source=f.read()

    try:
        compiler = NumbasCompiler(options)
        compiler.compile()
    except Exception as err:
        sys.stderr.write(str(err)+'\n')
        _, _, exc_traceback = sys.exc_info()
        if options.show_traceback:
            sys.stderr.write('\n')
            traceback.print_exc()
        exit(1)

if __name__ == '__main__':
    run()

