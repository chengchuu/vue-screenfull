'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

/* Vue Screenfull */
// https://vuejs.org/guide/typescript/overview.html#definecomponent

var com = vue.defineComponent({
  // type inference enabled
  template: "\n    <div>\n      <span>{{ FirstName }}</span>\n    </div>\n  ",
  // props: {
  //   name: String,
  //   msg: { type: String, required: true }
  // },
  data: function data() {
    return {
      count: 1,
      FirstName: 'm'
    };
  },
  mounted: function mounted() {
    // this.name; // type: string | undefined
    // this.msg; // type: string
    // this.count; // type: number
    this.FirstName = 'Cheng';
  }
});

exports.com = com;
