export class SCORM_API {
    initialized = false;
    terminated = false;
    last_error = 0;

    constructor(data) {
        data = data || {};
        const initial_data = {
        };
        this.counts = {
            'comments_from_learner': 0,
            'comments_from_lms': 0,
            'interactions': 0,
            'objectives': 0,
        }
        this.interaction_counts = [];
        this.data = Object.assign(initial_data, data);

        for(let key of Object.keys(this.data)) {
            this.check_key_counts_something(key);
        }

    }

    get allow_set() {
        return this.data['cmi.mode'] != 'review';
    }

    Initialize(b) {
        if(b!='' || this.initialized || this.terminated) {
			return false;
		}
		this.initialized = true;
		return true;
    }

    Terminate(b) {
		if(b!='' || !this.initialized || this.terminated) {
			return false;
		}
		this.terminated = true;

		return true;
    }

    GetLastError() {
		return this.last_error;
    }

    GetErrorString() {
        return this.last_error+'';
    }

    GetDiagnostic() {
        return '';
    }

    GetValue(key) {
		var v = this.data[key];
        if(v===undefined) {
            return '';
        } else {
            return v;
        }
    }

    SetValue(key,value) {
        if(!this.allow_set) {
            return;
        }
        value = value+'';
        var changed = value != this.data[key];
        if(changed) {
    		this.data[key] = value;
            this.check_key_counts_something(key);
        }
    }

    check_key_counts_something(key) {
        var m;
        if(m=key.match(/^cmi.(\w+).(\d+)/)) {
            var ckey = m[1];
            var n = parseInt(m[2]);
            this.counts[ckey] = Math.max(n+1, this.counts[ckey]);
            this.data['cmi.'+ckey+'._count'] = this.counts[ckey];
            if(ckey=='interactions' && this.interaction_counts[n]===undefined) {
                this.interaction_counts[n] = {
                    'objectives': 0,
                    'correct_responses': 0
                }
            }
        }
        if(m=key.match(/^cmi.interactions.(\d+).(objectives|correct_responses).(\d+)/)) {
            var n1 = parseInt(m[1]);
            var skey = m[2];
            var n2 = parseInt(m[3]);
            this.interaction_counts[n1][skey] = Math.max(n2+1, this.interaction_counts[n1][skey]);
            this.data['cmi.interactions.'+n1+'.'+skey+'._count'] = this.interaction_counts[n1][skey];
        }
    }

    Commit() {
        return true;
    }
}

export async function with_scorm(...fns) {
    let data = {
        'cmi.suspend_data': '',
        'cmi.objectives._count': 0,
        'cmi.interactions._count': 0,
        'cmi.learner_name': '',
        'cmi.learner_id': '',
        'cmi.location': '',
        'cmi.score.raw': 0,
        'cmi.score.scaled': 0,
        'cmi.score.min': 0,
        'cmi.score.max': 0,
        'cmi.total_time': 0,
        'cmi.success_status': '',
        'cmi.completion_status': 'not attempted',
    }

    const results = [];
    for(let fn of fns) {
        const scorm = new SCORM_API(data);
        window.API_1484_11 = scorm;

        const result = await fn(data, results, scorm);
        results.push(result);

        pipwerks.SCORM.connection.isActive = false;
        data = scorm.data;
        data['cmi.entry'] = 'resume';
    }

    return results;
}
