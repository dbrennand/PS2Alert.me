import pino from "pino";

export default pino({
  // Ignore pid and hostname
  base: undefined,
  // Set formatters so level label is shown instead of an integer
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});
