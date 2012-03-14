import os
import os.path
import shutil
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader('templates'),extensions=['jinja2.ext.autoescape'])

outputPath = os.path.join('..','webdocs')
if os.path.exists(outputPath):
	shutil.rmtree(outputPath)
shutil.copytree('static',outputPath)
shutil.copytree(os.path.join('..','..','runtime','scripts'),os.path.join(outputPath,'js','numbas'))

for fname in os.listdir(os.path.join('templates','content')):
	template = env.get_template('content/'+fname)
	open(os.path.join(outputPath,fname),'w',encoding='utf-8').write(template.render())

print("Webdocs created in "+outputPath)
