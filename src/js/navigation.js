/**
 * How a view asks the app to change screen, without importing the app itself.
 * app.js fills these in when it starts.
 *   open({ view, machineId })  shows another screen
 *   refresh()                  draws the current screen again
 */
export const navigation = {
  open() {},
  refresh() {},
};
