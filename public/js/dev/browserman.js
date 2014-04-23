var io = require('./lib/socket.io');
var browser = require('./lib/bowser').browser;

function Browserman(options) {
	var options = options || {};
	this.type = options.type || 'mocha',
	this.instance = options.instance || mocha;
	this.server = options.server || 'localhost:9000';
	this.reporter = {
		'mocha': function(mocha, socket) {
			var jobId = getURLParameter('jobId');
			if (!jobId) {
				mocha.run();
				return;
			}
			var result = {
				jobId: jobId,
				browser: {
					name: browser.name,
					version: browser.version
				},
				data: {
					passes: [],
					failures: []
				}
			};

			function Reporter(runner) {

				runner.on('pass', function(test) {
					result.data.passes.push({
						title: test.title,
						fullTitle: test.fullTitle(),
						duration: test.duration,
					})
				});

				runner.on('fail', function(test, err) {
					result.data.failures.push({
						title: test.title,
						fullTitle: test.fullTitle(),
						duration: test.duration,
						error: err.message
					});
				});

				runner.on('end', function() {
					socket.emit('done', result);
					window.close();

				});
			}
			socket.on('connect', function() {
				mocha.reporter(Reporter);
				mocha.run();
			});
		},
		'plain': function(window, socket) {
			var jobId = getURLParameter('jobId');
			if (!jobId) {
				return;
			}
			var result = {
				jobId: getURLParameter('jobId'),
				browser: {
					name: browser.name,
					version: browser.version
				},
				data: {
					passes: [],
					failures: []
				}
			};
			window.onerror = function(error, url, line) {
				result.data.failures.push({
					title: error,
					fullTitle: error,
					duration: 0,
					error: 'ERR:' + error + ' LINE:' + line
				});
			};
			socket.on('connect', function() {
				setTimeout(function() {
					console.log(result)
					socket.emit('done', result);
					window.close();
				}, 3000);
			});
		}

	}

}



Browserman.prototype.init = function() {
	var socket = io.connect('http://' + this.server + '/tester');
	this.reporter[this.type](this.instance, socket);
};

window.Browserman = Browserman;


function getURLParameter(name) {
	return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;
}