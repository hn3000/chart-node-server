
import { IDimension, IUnitFactors, dimension, DimensionSpec, dimensionF } from './dimension';

export interface IPosition {
    x() : number;
    y(): number;

    dimX(): IDimension;
    dimY(): IDimension;

    plus(that: IPosition): IPosition;
    minus(that: IPosition): IPosition;
    relative(x: DimensionSpec, y?: DimensionSpec): IPosition;

    leftBy(delta: DimensionSpec): IPosition;
    rightBy(delta: DimensionSpec): IPosition;

    aboveBy(delta: DimensionSpec): IPosition;
    belowBy(delta: DimensionSpec): IPosition;

    towards(that: IPosition, dx: number, dy?: number): IPosition;

    withLength(len: number): IPosition;

    resolve(env: IUnitFactors): this;

    xy(): [number, number];

    length(): number;

    quadrant(): number; // 0..3
    octant(): number; // 0..7

}

export interface IBox {
    topLeft(): IPosition;
    topRight(): IPosition;
    bottomLeft(): IPosition;
    bottomRight(): IPosition;

    center(): IPosition;

    top(): number;
    left(): number;
    bottom(): number;
    right(): number;

    width(): number;
    height(): number;

    xywh(): [number,number,number,number];
    tlbr(): [number,number,number,number];

    insideBox(deltaX: DimensionSpec, deltaY?: DimensionSpec): IBox;
    outsideBox(deltaX: DimensionSpec, deltaY?: DimensionSpec): IBox;

    resolve(env: IUnitFactors): this;
}


function length(x,y) {
    return Math.sqrt(x*x + y*y);
}

abstract class PositionBase implements IPosition {

    abstract x(): number;
    abstract y(): number;

    abstract dimX(): IDimension;
    abstract dimY(): IDimension;
    abstract resolve(env: IUnitFactors): this;


    plus(that: IPosition) {
        return this._maybeResolve(new RelativePosition(this, that.dimX(), that.dimY()));
    }

    minus(that: IPosition) {
        return this._maybeResolve(new RelativePosition(this, that.dimX().neg(), that.dimY().neg()));
    }
    relative(dx: DimensionSpec, dy: DimensionSpec = dx) {
        return this._maybeResolve(new RelativePosition(this, dx, dy));
    }

    leftBy(delta: DimensionSpec): IPosition {
        return this._maybeResolve(new RelativePosition(this, dimension(delta).neg(), 0));
    }
    rightBy(delta: DimensionSpec): IPosition {
        return this._maybeResolve(new RelativePosition(this, delta, 0));
    }

    aboveBy(delta: IDimension): IPosition {
        return this._maybeResolve(new RelativePosition(this, 0, dimension(delta).neg()));
    }
    belowBy(delta: IDimension): IPosition {
        return this._maybeResolve(new RelativePosition(this, 0, delta));
    }

    towards(that: IPosition, dx: number, dy = dx): IPosition {
        let result = position(
            dimensionF(this.dimX(), that.dimX(), (a,b) => a+(b-a)*dx),
            dimensionF(this.dimY(), that.dimY(), (a,b) => a+(b-a)*dy)
        );
        return this._maybeResolve(result);
    }

    withLength(newLength: number): IPosition {
        const myLength = this.length();
        const scale = x => x / myLength * newLength;
        const result = position(scale(this.x()), scale(this.y()));
        return this._maybeResolve(result);
    }

    length() {
        return length(this.x(), this.y());
    }

    xy() : [number, number] {
        return [ this.x(), this.y() ];
    }

    quadrant() : number {
        const yPos = this.y() >= 0;
        const xPos = this.x() >= 0;

        let q = yPos ? 0 : 2;
        q += (xPos === yPos) ? 0 : 1;

        return q;
    }


    //      2 | 1
    //   3    |    0
    // --------------
    //   4    |    7
    //      5 | 6


    //
    //  steep   ==   Q     O
    //  ------|----|---|-------
    //   0    |  0 | 0 |   0   
    //   0    |  1 | 0 |   0
    //   1    |  0 | 0 |   1     steep && !eq && even
    //   0    |  0 | 1 |   3     steep && !eq && even
    //   0    |  1 | 1 |   2
    //   1    |  0 | 1 |   2
    //   0    |  0 | 2 |   4
    //   0    |  1 | 2 |   4
    //   1    |  0 | 2 |   5     steep && !eq && even
    //   0    |  0 | 3 |   7     !steep && !eq && !even
    //   0    |  1 | 3 |   6
    //   1    |  0 | 3 |   6
    //

    octant() : number {
        const quadrant = this.quadrant();

        const steep = Math.abs(this.x()) < Math.abs(this.y());
        const halfAngle = Math.abs(this.x()) == Math.abs(this.y())
        const evenQ = 0 == quadrant % 2
        const plusOne = (steep == evenQ) && !halfAngle;

        return 2*quadrant + (plusOne ? 1 : 0);
    }


    protected _env(): IUnitFactors {
        return undefined;
    }

    protected _maybeResolve(x: IPosition): IPosition {
        if (this._env()) {
            return x.resolve(this._env());
        }
        return x;
    }
}


abstract class PositionBaseResolve extends PositionBase implements IPosition {
    resolve(env: IUnitFactors) {
        // keep a copy
        this._p_env = { ...env };
        return this;
    }

    x() {
        return this.dimX().value(this._env({}));
    }

    y() {
        return this.dimY().value(this._env({}));
    }

    protected _env(def: IUnitFactors = undefined): IUnitFactors {
        return this._p_env || def;
    }
    private _p_env?: IUnitFactors;
}

class RelativePosition extends PositionBaseResolve implements IPosition {
    constructor(ref: IPosition, dx: DimensionSpec, dy: DimensionSpec) {
        super();
        this._ref = ref;
        this._dx = dimension(dx);
        this._dy = dimension(dy);

        this._dimX = ref.dimX().plus(this._dx);
        this._dimY = ref.dimY().plus(this._dy);
    }

    dimX() {
        return this._dimX;
    }
    dimY() {
        return this._dimY;
    }
    private _ref: IPosition;
    private _dx: IDimension;
    private _dy: IDimension;

    private _dimX: IDimension;
    private _dimY: IDimension;

}

class Position extends PositionBaseResolve implements IPosition {
    constructor(x: DimensionSpec, y: DimensionSpec) {
        super();
        this._x = dimension(x);
        this._y = dimension(y);
    }

    dimX() : IDimension {
        return this._x;
    }

    dimY() : IDimension {
        return this._y;
    }

    private _x: IDimension;
    private _y: IDimension
}

export function position(x: DimensionSpec, y: DimensionSpec ): IPosition {
    return new Position(x, y);
}

export class Box implements IBox {
    constructor(pos1: IPosition, pos2: IPosition) {
        this._top = dimensionF(pos1.dimY(), pos2.dimY(), Math.min);
        this._left = dimensionF(pos1.dimX(), pos2.dimX(), Math.min);
        this._bottom = dimensionF(pos1.dimY(), pos2.dimY(), Math.max);
        this._right = dimensionF(pos1.dimX(), pos2.dimX(), Math.max);

        this._topLeft = new Position(this._left, this._top);
        this._topRight = new Position(this._right, this._top);
        this._bottomLeft = new Position(this._left, this._bottom);
        this._bottomRight = new Position(this._right, this._bottom);
    }

    resolve(env: IUnitFactors) {
        this._env = { ...env };
        this._topLeft.resolve(this._env);
        this._topRight.resolve(this._env);
        this._bottomLeft.resolve(this._env);
        this._bottomRight.resolve(this._env);
        return this;
    }

    top(): number { return this._top.value(this._env); }
    left(): number { return this._left.value(this._env); }
    bottom(): number { return this._bottom.value(this._env); }
    right(): number { return this._right.value(this._env); }

    topLeft() { return this._topLeft; }
    topRight() { return this._topRight; }
    bottomLeft() { return this._bottomLeft; }
    bottomRight() { return this._bottomRight; }

    center() { return this._topLeft.towards(this._bottomRight, 0.5); }

    height() { return this.bottom() - this.top(); }
    width() { return this.right() - this.left(); }


    xywh(): [number,number,number,number] { return [...this.topLeft().xy(), this.width(), this.height()]; }
    tlbr(): [number,number,number,number] { return [ this.top(), this.left(), this.bottom(), this.right() ]; }

    insideBox(deltaX: DimensionSpec, deltaY = deltaX) {
        let deltaDimX = dimension(deltaX);
        let deltaDimY = dimension(deltaY);
        let result = box(
            this._topLeft.relative(deltaDimX, deltaDimY), 
            this._bottomRight.relative(deltaDimX.neg(), deltaDimY.neg())
        );
        if (null != this._env) {
            result = result.resolve(this._env);
        }
        return result;
    }

    outsideBox(deltaX: DimensionSpec, deltaY = deltaX) {
        let deltaDimX = dimension(deltaX);
        let deltaDimY = dimension(deltaY);
        let result = box(
            this._topLeft.relative(deltaDimX.neg(), deltaDimY.neg()), 
            this._bottomRight.relative(deltaDimX, deltaDimY)
        );
        if (null != this._env) {
            result = result.resolve(this._env);
        }
        return result;
    }

    private _top: IDimension;
    private _left: IDimension;
    private _bottom: IDimension;
    private _right: IDimension;

    private _topLeft: IPosition;
    private _topRight: IPosition;
    private _bottomLeft: IPosition;
    private _bottomRight: IPosition;
    private _env: IUnitFactors;
}

export function box(left: DimensionSpec, top: DimensionSpec, right: DimensionSpec, bottom: DimensionSpec): IBox;
export function box(pos1: IPosition, pos2: IPosition): IBox;
export function box(): IBox {
    if (arguments.length === 2) {
        let [ pos1, pos2 ] = arguments;
        return new Box(pos1, pos2);
    }
    if (arguments.length === 4) {
        let [ left, top, right, bottom ] = arguments;
        return new Box(position(left, top), position(right, bottom));
    }
    throw new Error('box must be called with 2 or 4 arguments, not '+arguments.length);
}
