import type { App } from "vue";
import { Screenfull } from "../components/Screenfull";
import { vScreenfull } from "../directives/screenfull";
import type { VueScreenfullPluginOptions } from "../typing";

const VueScreenfull = {
  install(app: App, options: VueScreenfullPluginOptions = {}) {
    app.component(options.componentName ?? "Screenfull", Screenfull);
    app.directive(options.directiveName ?? "screenfull", vScreenfull);
  },
};

export default VueScreenfull;
