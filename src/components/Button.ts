import Phaser from 'phaser';
import { BooleanModel } from '../util/ValueModel';

export type ButtonStyle = Phaser.Types.GameObjects.Text.TextStyle;

const BASE_BUTTON_STYLE = {
	fontSize: '9px',
	padding: { x: 4, y: 2 },
	align: "center",
	backgroundColor: '#444444',
	color: '#FFFFFF',
};

const HOVER_STYLE = {
	color: '#f39c12',
};

const TOGGLED_STYLE = {
	color: '#ffff00',
	backgroundColor: '#666666',
};

const DISABLED_STYLE = {
	color: '#888888',
};

export class Button {

	text: string; // TODO: turn this into ValueModel<string>
	normalStyle: ButtonStyle;
	hoverStyle: ButtonStyle;
	downStyle: ButtonStyle;
	disabledStyle: ButtonStyle;
	readonly disabled: BooleanModel;
	textObject: Phaser.GameObjects.Text;
	callback: () => void = () => {};

	constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string,
		config: { callback?: () => void, style?: ButtonStyle, disabled?: boolean | BooleanModel } = {},
	) {
		this.text = label;
		this.textObject = scene.add.text(x, y, label);
		this.normalStyle = {
			...BASE_BUTTON_STYLE,
			...config.style,
			fixedWidth: w,
			fixedHeight: h,
		};
		this.hoverStyle = {
			...this.normalStyle,
			...HOVER_STYLE,
		};
		this.downStyle = {
			...this.normalStyle,
			...HOVER_STYLE,
			...TOGGLED_STYLE,
		};
		this.disabledStyle = {
			...this.normalStyle,
			...DISABLED_STYLE,
		};
		if (config.callback) {
			this.callback = config.callback;
		}
		this.textObject
			.setOrigin(0)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => this.handlePointerDown())
			.on('pointerup', () => this.handlePointerUp())
			.on('pointerover', () => this.handlePointerOver())
			.on('pointerout', () => this.handlePointerOut());

		if (config.disabled instanceof BooleanModel) {
			this.disabled = config.disabled;
		}
		else {
			this.disabled = new BooleanModel(config.disabled === true);
		}
		this.updateStyle();

		this.disabled.onChange.add(({ newVal } : { newVal: boolean}) => {
			if (newVal) {
				this.textObject.setInteractive({ useHandCursor: true });
			} else {
				this.textObject.disableInteractive();
			}
			this.updateStyle();
		});
	}

	/**
	 * Change the button text
	 * @param {string} newText - New text to display
	 */
	setText(newText: string) {
		this.text = newText;
		this.textObject.setText(newText);
	}
	
	/**
	 * Get the current text
	 * @returns {string}
	 */
	getText() {
		return this.text;
	}

	/**
	 * Update the text style based on current state
	 */
	updateStyle() {
		const style = this.disabled.get() ? this.disabledStyle : this.normalStyle;
		this.textObject.setStyle(style);
	}

	/**
	 * Handle pointer down event
	 */
	handlePointerDown() {
		if (this.disabled.get()) { return; }
		this.callback();
	}
	
	/**
	 * Handle pointer over event
	 */
	handlePointerOver() {
		if (this.disabled.get()) { return; }
		this.textObject.setStyle(HOVER_STYLE);
	}

	handlePointerUp() {
		if (this.disabled.get()) { return; }
		this.textObject.setStyle(HOVER_STYLE);
	}
	
	/**
	 * Handle pointer out event
	 */
	handlePointerOut() {
		if (this.disabled.get()) { return; }
		this.updateStyle();
	}

	destroy() {
		// Remove event listeners
		this.textObject.off('pointerdown');
		this.textObject.off('pointerup');
		this.textObject.off('pointerover');
		this.textObject.off('pointerout');
		
		// Destroy the text object
		this.textObject.destroy();
	}
}

type ToggleCallback = ( newValue: boolean, source: ToggleButton ) => void;

// Initial version of ToggleButton and ToggleButtonGroup generated with DeepSeek
export class ToggleButton extends Button {
	
	isToggled: boolean;
	group: ToggleButtonGroup | null;
	onToggleCallback: ToggleCallback | null;

	/**
	 * Creates a new Toggle Button
	 * @param {Phaser.Scene} scene - The Phaser scene
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {string} text - Button text
	 * @param {Object} config - Configuration options
	 * @param {boolean} config.isToggled - Initial toggled state (default: false)
	 * @param {Array} config.group - Button group for mutual exclusivity (optional)
	 * @param {Object} config.style - Text style for normal state
	 * @param {Object} config.toggledStyle - Text style for toggled state
	 * @param {Function} config.onToggle - Callback when toggled state changes
	 * @param {Boolean} config.disabled - make this button disabled.
	 */
	constructor(
		scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string,
		config: {
			isToggled?: boolean,
			group?: ToggleButtonGroup,
			style?: Phaser.Types.GameObjects.Text.TextStyle,
			toggledStyle?: Phaser.Types.GameObjects.Text.TextStyle,
			disabled?: boolean | BooleanModel,
			onToggle?: ToggleCallback,
		} = {},
	) {
		super(scene, x, y, w, h, text, {
			style: config.style, disabled: config.disabled,
		});
		this.text = text;
		this.isToggled = config.isToggled ?? false;
		this.group = config.group || null;
		this.onToggleCallback = config.onToggle || null;
		
		this.downStyle = {
			...this.normalStyle,
			...TOGGLED_STYLE,
			...config.toggledStyle,
		};
		
		// Create the text object
		this.textObject = scene.add.text(x, y, text);

		this.updateStyle();
		this.textObject.setOrigin(0);
				
		// Add to group if provided
		if (this.group) {
			this.group.add(this);
			// If this button is toggled initially, untoggle others in the group
			if (this.isToggled) {
				this.untoggleGroupExcept(this);
			}
		}
		
	}

	/**
	 * Update the text style based on current state
	 */
	override updateStyle() {
		const style = this.disabled.get() ? this.disabledStyle : (
			this.isToggled ? this.downStyle : this.normalStyle
		);
		this.textObject.setStyle(style);
	}

	/**
	 * Handle pointer down event
	 */
	override handlePointerDown() {
		if (this.disabled.get()) { return; }
		this.toggle();
	}
	
	/**
	 * Toggle the button state
	 * @param {boolean} skipCallback - Skip calling the callback
	 */
	toggle(skipCallback = false) {
		if (this.group && !this.isToggled) {
			// Untoggle all other buttons in the group first
			this.untoggleGroupExcept(this);
		}
		
		this.isToggled = !this.isToggled;
		
		// Update visual style
		this.updateStyle();
		
		// Call the callback if provided and not skipped
		if (!skipCallback && this.onToggleCallback) {
			this.onToggleCallback(this.isToggled, this);
		}
	}
	
	/**
	 * Set the button to toggled state
	 * @param {boolean} skipCallback - Skip calling the callback
	 */
	setToggled(skipCallback = false) {
		if (this.isToggled) return;
		
		if (this.group) {
			this.untoggleGroupExcept(this);
		}
		
		this.isToggled = true;
		this.updateStyle();
		
		if (!skipCallback && this.onToggleCallback) {
			this.onToggleCallback(this.isToggled, this);
		}
	}
	
	/**
	 * Set the button to untoggled state
	 * @param {boolean} skipCallback - Skip calling the callback
	 */
	setUntoggled(skipCallback = false) {
		if (!this.isToggled) return;
		
		this.isToggled = false;
		this.updateStyle();
		
		if (!skipCallback && this.onToggleCallback) {
			this.onToggleCallback(this.isToggled, this);
		}
	}
	
	/**
	 * Untoggle all buttons in the group except the specified one
	 * @param {ToggleButton} exceptButton - Button to exclude from untoggling
	 */
	untoggleGroupExcept(exceptButton: ToggleButton) {
		if (!this.group) return;
		
		this.group.getChildren().forEach((button: ToggleButton) => {
			if (button !== exceptButton && button.isToggled) {
				button.setUntoggled(true);
			}
		});
	}
	
	/**
	 * Get the toggled state
	 * @returns {boolean}
	 */
	getToggled() {
		return this.isToggled;
	}
			
	/**
	 * Destroy the button and clean up
	 */
	override destroy() {
		super.destroy();

		// Remove from group if exists
		if (this.group) {
			this.group.remove(this);
		}
	}
}

// Button Group Manager for easier group handling
export class ToggleButtonGroup {

	buttons: ToggleButton[] = [];
	
	/**
	 * Add a button to the group
	 * @param {ToggleButton} button - Button to add
	 */
	add(button: ToggleButton) {
		this.buttons.push(button);
		button.group = this;
	}
	
	/**
	 * Remove a button from the group
	 * @param {ToggleButton} button - Button to remove
	 */
	remove(button: ToggleButton) {
		const index = this.buttons.indexOf(button);
		if (index > -1) {
			this.buttons.splice(index, 1);
			button.group = null;
		}
	}
	
	/**
	 * Get all buttons in the group
	 * @returns {Array}
	 */
	getChildren() {
		return this.buttons;
	}
	
	/**
	 * Get the currently toggled button (returns first found)
	 * @returns {ToggleButton|null}
	 */
	getToggledButton() {
		return this.buttons.find(button => button.isToggled) || null;
	}
	
	/**
	 * Get all toggled buttons (for non-exclusive groups)
	 * @returns {Array}
	 */
	getToggledButtons() {
		return this.buttons.filter(button => button.isToggled);
	}
	
	/**
	 * Clear all buttons (destroy them)
	 */
	clear() {
		this.buttons.forEach(button => button.destroy());
		this.buttons = [];
	}
	
	/**
	 * Set all buttons to untoggled state
	 */
	clearAllToggled() {
		this.buttons.forEach(button => {
			if (button.isToggled) {
				button.setUntoggled(true);
			}
		});
	}
}
