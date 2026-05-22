const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Secure Admin Configuration Manager
 * Stores the admin password in a secure config file in userData directory
 * This file should be added to .gitignore for security
 */
class AdminConfig {
    constructor(userDataPath) {
        this.configDir = userDataPath;
        this.configFile = path.join(this.configDir, '.admin-config.json');
        this.defaultAdminPassword = 'Vero123*'; // Default for initial setup only
    }

    /**
     * Initialize admin config - create if doesn't exist
     */
    init() {
        if (!fs.existsSync(this.configFile)) {
            this.saveConfig({
                adminPassword: this.defaultAdminPassword,
                createdAt: new Date().toISOString(),
                protected: false
            });
        }
    }

    /**
     * Get admin password
     */
    getAdminPassword() {
        try {
            if (fs.existsSync(this.configFile)) {
                const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
                return config.adminPassword || this.defaultAdminPassword;
            }
        } catch (e) {
            console.error('[AdminConfig] Error reading admin config:', e);
        }
        return this.defaultAdminPassword;
    }

    /**
     * Update admin password
     */
    setAdminPassword(newPassword) {
        try {
            const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
            config.adminPassword = newPassword;
            config.updatedAt = new Date().toISOString();
            config.protected = true;
            this.saveConfig(config);
            return { success: true, message: 'Admin password updated successfully' };
        } catch (e) {
            console.error('[AdminConfig] Error updating admin password:', e);
            return { success: false, message: 'Failed to update password' };
        }
    }

    /**
     * Save config to file
     */
    saveConfig(config) {
        try {
            if (!fs.existsSync(this.configDir)) {
                fs.mkdirSync(this.configDir, { recursive: true });
            }
            fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
        } catch (e) {
            console.error('[AdminConfig] Error saving config:', e);
        }
    }
}

module.exports = AdminConfig;
