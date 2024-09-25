# load an exam from a source file, migrating it to the latest version if necessary
from .examparser import ExamParser
from .migrations import migrations
import json

NUMBAS_FILE_PREFIX = '// Numbas version: '

class VersionError(Exception):
    def __init__(self,version):
        self.version = version
    def __str__(self):
        return 'Invalid version number %s' % self.version

class NumbasObject:
    version = '1'

    def __init__(self,source=None,data=None,version='1'):
        if data is not None:
            self.set_data(data,version)
        elif source:
            self.from_source(source)
    
    def set_data(self,data,version):
        self.data = data
        self.version = version
        self.migrate_data()

    def from_source(self,source):
        self.source = source
        try:
            if not isinstance(source,unicode):
                source=unicode(source,encoding='utf-8')
        except NameError:
            pass

        source = source.replace('\ufeff','')
        if len(source)==0:
            raise Exception("Empty source string")

        # Files with version numbers have a line of the format     
        # // Numbas version: <version string> 
        # at the start, and are encoded in JSON. Older files have no version number and are in the .exam format
        if source.startswith(NUMBAS_FILE_PREFIX):
            version, json_string = source.split('\n',1)
            try:
                version = version[len(NUMBAS_FILE_PREFIX):].strip()
            except ValueError:
                raise VersionError(version)
            data = json.loads(json_string)
        else:
            version = '1'
            data = ExamParser().parse(source)

        self.version, self.data = version,data
        self.migrate_data()

    def migrate_data(self):
        while self.version in migrations:
            self.version = migrations[self.version](self)

    def __str__(self):
        return '%s%s\n%s' % (NUMBAS_FILE_PREFIX,self.version,json.dumps(self.data))

