const Rable = require('rable.js');
const RableAPI = require(__dirname + '/lib');
const app = new Rable({
	port: 3002,
	assets: 'assets'
});

//bind the API controller to the Rable instance.
const api = new RableAPI(app);
api.defaultMethod('get');

//create the API(s)
var exampleAPI = api.createAPI('example');
var dateAPI = api.createAPI('date');

//register the Actions for API 'example'.
	exampleAPI.registerAction('plain', (req, res) => res.json({
		success: true,
		message: 'You have reached the first API!'
	}));

	exampleAPI.registerAction('params', (req, res) => res.json({
		success: true,
		message: 'Here are the provided params',
		result: req.params
	}), {
		params: ':first/second'
	});

	exampleAPI.registerAction('query', (req, res) => res.json({
		success: true,
		result: req.query
	}));

	exampleAPI.registerAction('body', (req, res) => res.json({
		success: true,
		result: req.body
	}), 'post');

	exampleAPI.registerAction('actions', (req, res) => {
		var acs = exampleAPI.listActions();
		var final = [];

		acs.forEach(ac => {
			ac = exampleAPI.obtainAction(ac.name, ac.method);
			final.push({
				name: ac.name,
				method: ac.method,
				params: ac.params
			});
		})

		res.json({
			success: true,
			result: final
		})
	})

//register the Actions for API 'date'.
	dateAPI.registerAction('year', (req, res) => res.json({
		success: true,
		result: new Date().getFullYear()
	}));

	dateAPI.registerAction('day', (req, res) => res.json({
		success: true,
		result: new Date().getDate()
	}));

	dateAPI.registerAction('month', (req, res) => res.json({
		success: true,
		result: new Date().getMonth() + 1 //months start at 0 in javascript.
	}));

	dateAPI.registerAction('date', (req, res) => res.json({
		success: true,
		result: [new Date().getMonth() + 1, new Date().getDate(), new Date().getFullYear()].join('-')
	}));

	dateAPI.registerAction('hour', (req, res) => res.json({
		success: true,
		result: new Date().getHours()
	}));

	dateAPI.registerAction('minute', (req, res) => res.json({
		success: true,
		result: new Date().getMinutes()
	}));

	dateAPI.registerAction('second', (req, res) => res.json({
		success: true,
		result: new Date().getSeconds()
	}));

	dateAPI.registerAction('time', (req, res) => res.json({
		success: true,
		result: [new Date().getHours(), new Date().getMinutes(), new Date().getSeconds()].join(':')
	}));

	dateAPI.registerAction('full', (req, res) => res.json({
		success: true,
		result: [new Date().getMonth() + 1, new Date().getDate(), new Date().getFullYear()].join('-') + ' ' + [new Date().getHours(), new Date().getMinutes(), new Date().getSeconds()].join(':')
	}));

	dateAPI.registerAction('actions', (req, res) => {
		var acs = dateAPI.listActions();
		var final = [];

		acs.forEach(ac => {
			ac = dateAPI.obtainAction(ac.name, ac.method);
			final.push({
				name: ac.name,
				method: ac.method,
				params: ac.params
			});
		})

		res.json({
			success: true,
			actions: final
		})
	})



app.info.set('name', 'rable.js-api ' + api.version + ' showcase');
app.info.set('version', api.version);

app.template.setElement('navbar', __dirname + '/elements/navbar.rbl');
app.template.setElement('footer', __dirname + '/elements/footer.rbl');

app.get('/', __dirname + '/views/home.html');
app.static('/docs', __dirname + '/docs/rable.js-api', {noTemplate: true});
