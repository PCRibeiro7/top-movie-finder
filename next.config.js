module.exports = {
    webpack(config, { dev }) {
        if (dev && process.platform === 'win32') {
            config.watchOptions = {
                ...config.watchOptions,
                // Watching ancestor entries such as D:/Pedro scans the drive root.
                // Keep Next.js exclusions and skip only direct drive-root entries.
                ignored: new RegExp(
                    `${config.watchOptions.ignored.source}|^[A-Za-z]:/[^/]+$`
                ),
            };
        }

        return config;
    },
};
