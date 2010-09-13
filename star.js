/*
 * Use with HatenaStar.js:
 *  Hatena.Star.BaseURL = 'http://local.hatena.ne.jp:3100/';
 *
 * curl http://localhost:3100/add.star.json?uri=http://example.com/
 * curl http://localhost:3100/entries.json?uri=http://example.com/
 *
 */
var Http = require('http');
var Url  = require('url');
var sys  = require('sys');

Star = {};
Star.DB = {};
Star.DB.Memory = function () { this.init.apply(this, arguments) };
Star.DB.Memory.prototype = {
	init : function () {
		this.db = {};
	},

	set : function (key, val) {
		this.db[key] = val;
	},

	get : function (key) {
		return this.db[key];
	}
};
Star.Server =  function () { this.init.apply(this, arguments) };
Star.Server.prototype = {
	init : function () {
		this.db = new Star.DB.Memory();
	},

	start : function () {
		var self = this;
		Http.createServer(function (req, res) { self.handle(req, res); }).listen(3100);
	},

	handle : function (req, res) {
		req.url = Url.parse(req.url, true);
		req.param = req.url.query || {};
		var handler = this.handlers[req.url.pathname];
		if (handler) {
			var r = new Star.Server.Context(req, res);
			handler.call(this, r);
		} else {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not found');
		}
	},

	handlers : {
		'/star.add.json' : function (r) {
			var uri = r.req.param['uri'];

			console.log(['set star', r.user(), uri]);
			// XXX: must be atomic
			var val = this.db.get(uri);
			val = val ? val.split(/,/) : [];
			val.push(r.user());
			this.db.set(uri, val.join(','));

			var stash = {
				"color": "yellow",
				"name":  r.user()
			};
			r.responseJSON(stash, { allowJSONP : true });

			console.log(this.db);
		},
		'/entries.json' : function (r) {
			var uri = r.req.param['uri'];
			if (typeof uri == 'string') uri = [ uri ]; // req interface sucks

			var stash = {
				can_comment: false,
				entries : [],
				rks : 'XXX'
			};

			for (var i = 0, len = uri.length; i < len; i++) {
				var entry = {
					uri : uri[i],
					stars : []
				};

				var val = this.db.get(uri[i]);
				var names = val ? val.split(/,/) : [];
				for (var j = 0, nlen = names.length; j < nlen; j++) {
					entry.stars.push({
						name : names[j]
					});
				}

				stash.entries.push(entry);
			}

			r.responseJSON(stash, { allowJSONP : true });
		},

		'/debug.dump' : function (r) {
			r.res.writeHead(200, { 'Content-Type': 'text/plain' });
			r.res.end(sys.inspect(this.db));
		}
	}
};
Star.Server.Context = function () { this.init.apply(this, arguments) };
Star.Server.Context.prototype = {
	init : function (req, res) {
		this.req = req;
		this.res = res;
	},

	user : function () {
		return 'sample';
	},

	responseJSON : function (stash, opts) {
		var r = this;
		var json = JSON.stringify(stash);
		if (opts.allowJSONP) {
			if (r.req.param['callback']) {
				json = r.req.param['callback'] + '(' + json + ')';
			}
		}
		r.res.writeHead(200, { 'Content': 'text/javascript' });
		r.res.end(json);
	}
};

new Star.Server().start();


