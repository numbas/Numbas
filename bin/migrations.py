from functools import wraps

migrations = {}
def migration(version_from):
    def migration_decorator(f):
        @wraps(f)
        def do_migration(object):
            data = object.data
            if not data.get('type'):
                data['type'] = 'exam' if 'navigation' in data else 'question'
            f(data)
            return f.__name__
        migrations[version_from] = do_migration
        return do_migration
    return migration_decorator

# migration to apply to each question in an exam
def question_migration(f):
    @wraps(f)
    def do_migration(data):
        if not data.get('type'):
            data['type'] = 'exam' if 'navigation' in data else 'question'

        if data.get('type')=='exam':
            for question in data.setdefault('questions',[]):
                f(question)
        elif data.get('type')=='question':
            f(data)
    return do_migration

def part_migration(f):
    @wraps(f)
    @question_migration
    def do_migration(question):
        if 'parts' in question:
            for part in question['parts']:
                f(part)
                if 'steps' in part:
                    for step in part['steps']:
                        f(step)
                if 'gaps' in part:
                    for gap in part['gaps']:
                        f(gap)
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

@migration('variables_as_objects')
@question_migration
def variable_groups_as_arrays(question):
    if 'variable_groups' in question:
        variable_groups = question.get('variable_groups')
        if type(variable_groups)==dict:
            question['variable_groups'] = [{'name':name,'variables':variables} for name,variables in variable_groups.items()]
    else:
        question['variable_groups'] = []

@migration('variable_groups_as_arrays')
def pick_questions(data):
    if data['type']=='exam':
        data['allQuestions'] = True
        data['pickQuestions'] = 0

@migration('pick_questions')
@question_migration
def custom_script_order(question):
    default_orders = {
        'constructor': 'after',
        'mark': 'instead',
        'validate': 'instead',
    }

    def fix_part(part):
        if 'scripts' in part:
            for name,script in part['scripts'].items():
                part['scripts'][name] = {'order': default_orders[name],'script':script}

    if 'parts' in question:
        for part in question['parts']:
            fix_part(part)
            if 'steps' in part:
                for step in part['steps']:
                    fix_part(step)
            if 'gaps' in part:
                for gap in part['gaps']:
                    fix_part(gap)

@migration(version_from='custom_script_order')
@part_migration
def show_precision_hint(part):
    """ For existing questions, set the numberentry property "show precision restriction hint" to False, because most questions already have this text in the prompt. """

    if part['type']=='numberentry':
        part['showPrecisionHint'] = False

@migration(version_from='show_precision_hint')
def exam_question_groups(data):
    allQuestions = data.get('allQuestions',True)
    try:
        pickQuestions = int(data.get('pickQuestions',0))
    except ValueError:
        pickQuestions = 0
    shuffleQuestions = data.get('shuffleQuestions',False)
    if shuffleQuestions:
        if pickQuestions>0:
            pickingStrategy = 'random-subset'
        else:
            pickingStrategy = 'all-shuffled'
    else:
        pickingStrategy = 'all-ordered'

    data['showQuestionGroupNames'] = False

    data['question_groups'] = [{
        'name': '',
        'pickingStrategy': pickingStrategy,
        'pickQuestions': pickQuestions,
        'questions': data.get('questions',[]),
    }]

@migration(version_from='exam_question_groups')
def exam_results_page_options(data):
    if data['type'] != 'exam':
        return
    showresultspage = 'oncompletion' if data['navigation'].get('showresultspage') else 'never'
    data['navigation']['showresultspage'] = showresultspage

@migration(version_from='exam_results_page_options')
def finer_feedback_settings(data):
    if data['type'] != 'exam':
        return

    navigation = data.get('navigation', {})
    feedback = data.get('feedback', {})
    reviewshowexpectedanswer = feedback.get('reviewshowexpectedanswer', True)
    showresultspage = navigation.get('showresultspage', 'oncompletion')
    enterreviewmodeimmediately = feedback['enterreviewmodeimmediately'] = showresultspage == 'oncompletion'
    review_setting = ('oncompletion' if enterreviewmodeimmediately else 'inreview' if showresultspage != 'never' else 'never') if reviewshowexpectedanswer else 'never'

    feedback['showexpectedanswerswhen'] = 'inreview' if showresultspage in ('oncompletion', 'inreview') else 'never'

    feedback['showpartfeedbackmessageswhen'] = 'always' if feedback.get('showanswerstate', True) else (review_setting if feedback.get('reviewshowfeedback', True) else 'never')

    for key in ('showactualmark', 'showtotalmark', 'showanswerstate'):
        v = feedback.get(key, True)
        feedback[key+'when'] = 'always' if v else review_setting

    if not feedback.get('reviewshowscore', True):
        feedback['showactualmarkwhen'] = 'never'
        feedback['showanswerstatewhen'] = 'never'

    if not feedback.get('reviewshowfeedback', True):
        feedback['showactualmarkwhen'] = 'never'

    feedback['showadvicewhen'] = 'inreview' if feedback.get('reviewshowadvice') else 'never'
