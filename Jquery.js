// ==UserScript==
// @name        Wanikani Open Framework - Jquery module
// @namespace   rfindley
// @description Progress module for Wanikani Open Framework
// @version     1.0.0
// @copyright   2022+, Robin Findley
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

(function(global) {

	//########################################################################
	//------------------------------
	// Published interface
	//------------------------------
	global.wkof.Jquery = {
		version: version,
	};
	//########################################################################

	var version;

	wkof.ready('document')
	.then(function(){
		var promises = [];
		try {
			$.fn.jquery;
		} catch(e) {
			promises.push(wkof.load_script(wkof.support_files['jquery.js'], true /* cache */));
		}
		return Promise.all(promises);
	})
	.then(function(data){
		version = $.fn.jquery;
		// Notify listeners that we are ready.
		// Delay guarantees include() callbacks are called before ready() callbacks.
		setTimeout(function(){wkof.set_state('wkof.Jquery', 'ready');},0);
	});

})(window);
