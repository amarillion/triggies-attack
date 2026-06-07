import { Signal } from './Signal.js';

type ValueModelChangeEvent<T> = {
	readonly oldVal: T,
	readonly newVal: T,
};

class ValueModel<T> {
	protected _value: T;
	readonly onChange: Signal<ValueModelChangeEvent<T>>;

	constructor(value: T) {
		this._value = value;
		this.onChange = new Signal();
	}

	set(value: T) {
		if (value !== this._value) {
			const oldVal = this._value;
			this._value = value;
			this.onChange.dispatch({ oldVal, newVal: value });
			return true;
		}
		return false;
	}

	get() {
		return this._value;
	}

}

export class NumberModel extends ValueModel<number> {
	constructor(value = 0) {
		super(value);
	}

	add(value: number) {
		this.set(this._value + value);
	}
}

/**
 * Be careful of using this in a boolean evaluation context,
 * for example:
 *
 * const flag = new BooleanModel(false);
 * if (flag) { // evaluates to true! Should be flag.get()
 * }
 *
 * especially when refactoring from flag: boolean to flag: BooleanModel.
 *
 * Use `@typescript-eslint/strict-boolean-expressions` to catch this issue.
 */
export class BooleanModel extends ValueModel<boolean> {
	
	toggle() {
		this.set(!this._value);
	}
}
