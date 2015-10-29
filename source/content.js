var xdebug = (function() {
	// Set a cookie
	function setCookie(name, value, hours)
	{
		var exp = new Date();
		exp.setTime(exp.getTime() + (hours * 60 * 60 * 1000));
		document.cookie = name + "=" + value + "; expires=" + exp.toGMTString() + "; path=/";
	}

	// Get the content in a cookie
	function getCookie(name)
	{
		// Search for the start of the goven cookie
		var prefix = name + "=",
			cookieStartIndex = document.cookie.indexOf(prefix),
			cookieEndIndex;

		// If the cookie is not found return null
		if (cookieStartIndex == -1)
		{
			return null;
		}

		// Look for the end of the cookie
		cookieEndIndex = document.cookie.indexOf(";", cookieStartIndex + prefix.length);
		if (cookieEndIndex == -1)
		{
			cookieEndIndex = document.cookie.length;
		}

		// Extract the cookie content
		return unescape(document.cookie.substring(cookieStartIndex + prefix.length, cookieEndIndex));
	}

	// Remove a cookie
	function deleteCookie(name)
	{
		setCookie(name, null, -60);
	}

	// Public methods
	var exposed = {
		// Handles messages from other extension parts
		messageListener : function(request, sender, sendResponse)
		{
			var newStatus,
				idekey = "XDEBUG_ECLIPSE";

			// Use the IDE key from the request, if any is given
			if (request.idekey)
			{
				idekey = request.idekey;
			}

			// Execute the requested command
			if (request.cmd == "getStatus")
			{
				newStatus = exposed.getStatus(idekey);
			}
			else if (request.cmd == "toggleStatus")
			{
				newStatus = exposed.toggleStatus(idekey);
			}
			else if (request.cmd == "setStatus")
			{
				newStatus = exposed.setStatus(request.status, idekey);
			}

			// Respond with the current status
			sendResponse({ status: newStatus });
		},

		// Get current state
		getStatus : function(idekey)
		{
			var status = 0;

            if (getCookie("PHP_CONTEXT") == "hhvm" && getCookie("XDEBUG_SESSION") == idekey)
            {
                status = 5;
            }
            else if (getCookie("PHP_CONTEXT") == "hhvm")
            {
                status = 4;
            }
			else if (getCookie("XDEBUG_SESSION") == idekey)
			{
				status = 1;
			}
			else if (getCookie("XDEBUG_PROFILE") == idekey)
			{
				status = 2;
			}
			else if (getCookie("XDEBUG_TRACE") == idekey)
			{
				status = 3;
			}


			return status;
		},

		// Toggle to the next state
		toggleStatus : function(idekey)
		{
			var nextStatus = (exposed.getStatus(idekey) + 1) % 4;
			return exposed.setStatus(nextStatus, idekey);
		},

		// Set the state
		setStatus : function(status, idekey)
		{
            var cookieTime = 24 * 365;
			if (status == 1)
			{
				// Set debugging on
				setCookie("XDEBUG_SESSION", idekey, cookieTime);
				deleteCookie("XDEBUG_PROFILE");
				deleteCookie("XDEBUG_TRACE");
                setCookie("PHP_CONTEXT", 'phpfpm', cookieTime);
			}
			else if (status == 2)
			{
				// Set profiling on
				deleteCookie("XDEBUG_SESSION");
				setCookie("XDEBUG_PROFILE", idekey, cookieTime);
				deleteCookie("XDEBUG_TRACE");
                setCookie("PHP_CONTEXT", 'phpfpm', cookieTime);
			}
			else if (status == 3)
			{
				// Set tracing on
				deleteCookie("XDEBUG_SESSION");
				deleteCookie("XDEBUG_PROFILE");
				setCookie("XDEBUG_TRACE", idekey, cookieTime);
                setCookie("PHP_CONTEXT", 'phpfpm', cookieTime);
			}
            else if (status == 4)
            {
                // Set tracing on
                deleteCookie("XDEBUG_SESSION");
                deleteCookie("XDEBUG_PROFILE");
                deleteCookie("XDEBUG_TRACE");
                setCookie("PHP_CONTEXT", 'hhvm', cookieTime);
            }
            else if (status == 5)
            {
                // Set debugging on
                setCookie("XDEBUG_SESSION", idekey, cookieTime);
                deleteCookie("XDEBUG_PROFILE");
                deleteCookie("XDEBUG_TRACE");
                setCookie("PHP_CONTEXT", 'hhvm', cookieTime);
            }
			else
			{
				// Disable all Xdebug functions
				deleteCookie("XDEBUG_SESSION");
				deleteCookie("XDEBUG_PROFILE");
				deleteCookie("XDEBUG_TRACE");
                deleteCookie("PHP_CONTEXT");
			}

			// Return the new status
			return exposed.getStatus(idekey);
		}
	};

	return exposed;
})();

// Attach the message listener
chrome.runtime.onMessage.addListener(xdebug.messageListener);
