from functools import wraps

migrations = {}
def migration(version_from):
	def migration_decorator(f):
		@wraps(f)
		def do_migration(object):
			f(object.data)
			return f.__name__
		migrations[version_from] = do_migration
		return do_migration
	return migration_decorator

# migration to apply to each question in an exam
def question_migration(f):
	@wraps(f)
	def do_migration(data):
		if data.get('type')=='exam':
			for question in data.get('questions'):
				f(question)
		elif data.get('type')=='question':
			f(data)
	return do_migration

@migration('1')
def exam_or_question(data):
	if not data.get('type'):
		data['type'] = 'exam' if 'navigation' in data else 'question'

@migration('exam_or_question')
@question_migration
def variables_as_objects(question):
	variables = question.get('variables')
	if variables:
		for name,definition in variables.items():
			variables[name] = {
				'name': name,
				'definition': definition,
			}
