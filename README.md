#State routing across multiple modules

Custom state handling/routing for modularized angular app, in requirejs format

To use:
Require this module in your app "module.multistate"

###Set states for your module in the .run of your module : 

	//inject multistate
    .run(function(ModuleModel) {
      var callback = function(name, obj) {
                console.log(name, obj);
            }

		ModuleModel.add("module3", callback2)
		    .addState("calender", ["day", "week", "month"]);


**The setModule accepts 2 arguemnts**, the **module name** and the **callback**. The callback can be set to whatever you want - *it must accept 2 parameters*, the state name, and the object with the states themselves. Most likely this will be set to a service/factory. The callback will be fired everyime that specific modules states get changed. It is currently set to callback even if state is the same - so you may handle this scenario as you please.

You can then chain .addState() onto that, which accepts the state name, then array of state parameters.

###To change state : 

    MultistateRoute.goState("module1,", "calender", ["5", "1", "4]);

Use goState(). Gostate accepts 3 arguments, the **module name**, the **state name**, and the **array of states**.
