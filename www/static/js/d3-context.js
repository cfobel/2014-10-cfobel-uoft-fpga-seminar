function transform_string(transform_obj) {
    return ("translate(" + transform_obj.translate[0] + "," +
            transform_obj.translate[1] + ")scale(" + transform_obj.scale +
            ")");
}

function extract_property_attrs(selector, property_attrs) {
    var _property_attrs = {};
    for (var property in property_attrs) {
        var attrs = property_attrs[property];
        _property_attrs[property] = [];
        selector.each(function() {
            var d3_element = d3.select(this);
            /* Save the state of each style attribute in `style_attrs` list for the
             * current element. */
            var element_attrs = {};
            for (var i = 0; i < attrs.length; i++) {
                element_attrs[attrs[i]] = d3_element[property](attrs[i]);
            }
            _property_attrs[property].push([d3_element, element_attrs]);
        });
    }
    return _property_attrs;
}

function merge_property_states(states) {
    var combined = {};
    for (var i = 0; i < states.length; i++) {
        var state = states[i];
        for (var property in state) {
            if (property in combined) {
                combined[property] = combined[property].concat(state
                                                               [property]);
            } else {
                combined[property] = [].concat(state[property]);
            }
        }
    }
    return combined;
}

function undo_state(selector, property_attr_values) {
    /* Save state of any property that would be modified by setting
    * `property_attr_values`.  This allows, e.g., to undo the changes due
    * in `property_attr_values`. */
    var property_attrs = {};
    for (var property in property_attr_values) {
        property_attrs[property] = Object.keys(property_attr_values
                                               [property]);
    }
    return extract_property_attrs(selector, property_attrs);
}

function extract_styles(selector, style_attrs) {
    return extract_property_attrs(selector, 'style', style_attrs);
}

var D3Context = function() {
    this.state_stack = [];
    this.extend = $.proxy(function (selector_property_attr_values, duration) {
        /* Save current state of property before modifying it. */
        var current_states = [];
        for (var i = 0; i < selector_property_attr_values.length; i++) {
            var selector = selector_property_attr_values[i].selector;
            var property_attr_values = (selector_property_attr_values[i]
                                        .property_attr_values);
            console.log([selector, property_attr_values]);
            current_states.push(undo_state(selector, property_attr_values));
        }
        this.state_stack.push(merge_property_states(current_states));

        if (typeof(duration) == "undefined") { duration = 500; }

        var transition;
        for (var i = 0; i < selector_property_attr_values.length; i++) {
            var selector = selector_property_attr_values[i].selector;
            var property_attr_values = (selector_property_attr_values[i]
                                        .property_attr_values);
            if (duration == 0) {
                /* If duration is set to 0, do not apply d3 transition. */
                transition = selector;
            } else {
                transition = selector.transition().duration(duration);
            }
            for (var property in property_attr_values) {
                var attrs = property_attr_values[property];
                for (var attr in attrs) {
                   transition = transition[property](attr, attrs[attr]);
                }
            }
        }
    }, this);
    this.push = $.proxy(function (selector, property_attr_values, duration) {
        this.extend([{'selector': selector,
                      'property_attr_values': property_attr_values}], duration);
    }, this);
    this.apply_state = $.proxy(function (state, duration) {
        if (typeof(duration) == "undefined") { duration = 500; }
        /* Restore saved state of property attributes for each element. */
        for (var property in state) {
            var property_state = state[property];
            for (var i = 0; i < property_state.length; i++) {
                var d3_element = property_state[i][0];
                var attrs = property_state[i][1];
                var transition;
                if (duration == 0) {
                    /* If duration is set to 0, do not apply d3 transition. */
                    transition = d3_element;
                } else {
                    transition = d3_element.transition().duration(duration);
                }
                for (var attr in attrs) {
                   transition = transition[property](attr, attrs[attr]);
                }
            }
        }
    }, this);
    this.pop = $.proxy(function (duration) {
        if (this.state_stack.length < 1) {
            /* Nothing to do. */
            return;
        }
        /* Apply the most recently saved state. */
        this.apply_state(this.state_stack.pop());
    }, this);
}
