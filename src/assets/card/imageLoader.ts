import { CardType } from '../../game/card';
import BACK from './UU-Back-Main.png';
import NeighIcon from './neigh-icon.png';
import MagicIcon from './star-icon.png';
import UnicornIcon from './unicorn-icon.png';
import UpgradeIcon from './upgrade-icon.png';
import DowngradeIcon from './downgrade-icon.png';


const ImageLoader = {
    count: () => {
        return require.context('./square', true).keys().length;
    },
    load: (key: string) => {
        if (key === "back" || !key) {
            return BACK;
        }
        // Custom cards uploaded through the admin panel store their art as a
        // server URL ("/uploads/..") rather than a bundled key - use it as-is.
        if (key.charAt(0) === "/" || /^https?:\/\//i.test(key)) {
            return key;
        }
        try {
            // dynamic require: unknown keys throw at runtime -> fall back to the card back
            return require(`./square/${key}.png`).default;
        } catch (e) {
            return BACK;
        }
    },
    icon: (type: CardType) => {
        switch(type) {
            case "baby":
            case "basic":
            case "narwhal":
            case "unicorn":
                return UnicornIcon;
            case "magic":
                return MagicIcon;
            case "upgrade":
                return UpgradeIcon;
            case "downgrade":
                return DowngradeIcon;
            case "neigh":
            case "super_neigh":
                return NeighIcon;
            default:
                return undefined;
        }
    }
};

export default ImageLoader;