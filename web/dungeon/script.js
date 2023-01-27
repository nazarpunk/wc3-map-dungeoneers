// noinspection DuplicatedCode

class Random {
	constructor(seed) {
		this.m_w = seed;
		this.m_z = 987654321;
		this.mask = 0xffffffff;
	}

	next() {
		this.m_z = 36969 * (this.m_z & 65535) + (this.m_z >> 16) & this.mask;
		this.m_w = 18000 * (this.m_w & 65535) + (this.m_w >> 16) & this.mask;
		return ((this.m_z << 16) + this.m_w & this.mask) / 4294967296 + .5;
	}

	/**
	 * @param {number} min
	 * @param {number} max
	 * @return {number}
	 */
	int(min, max) {
		return Math.floor(this.next() * (max - min + 1) + min);
	}
}

const dungeonWidth = 220;
const dungeonHeight = 180;
const cellSize = 6;
const seed = Date.now();
//const seed = 1674773190194;
//console.log(seed);
const rand = new Random(seed);
const tiles = {
	EMPTY: 0,
	WALL: 1,
	FLOOR: 2
};
const map = [];
for (let i = 0; i < dungeonWidth * dungeonHeight; i++) {
	map[i] = tiles.EMPTY;
}
const connections = [];

class Room {
	/** @type {Bounds}*/ bounds;
	/** @type {?Room}*/ left = null;
	/** @type {?Room}*/ right = null;

	/**
	 * @param {Bounds} bounds
	 */
	constructor(bounds) {
		this.bounds = bounds;
	}

	split() {
		const b = this.bounds;
		let v;
		if (b.h / b.w < .8) {
			v = true;
		} else if (b.w / b.h < .8) {
			v = false;
		} else {
			v = rand.next() >= .5;
		}

		const r = s => {
			const a = Math.floor(s * .25);
			return rand.int(a, s - a)
		};

		let ba;
		if (v) {
			ba = new Bounds(b.x, b.y, r(b.w), b.h);
			this.right = new Room(new Bounds(b.x + ba.w, b.y, b.w - ba.w, b.h));
		} else {
			ba = new Bounds(b.x, b.y, b.w, r(b.h));
			this.right = new Room(new Bounds(b.x, b.y + ba.h, b.w, b.h - ba.h));
		}
		this.left = new Room(ba);
	}

	/** @return {Room[]} */
	flat() {
		const flat = [];
		const stack = [];
		let room = this;

		while (stack.length > 0 || room !== null) {
			if (room !== null) {
				stack.push(room);
				room = room.left;
			} else {
				room = stack.pop();
				if (room.left === null && room.right === null) {
					flat.push(room);
				}
				room = room.right;
			}
		}

		return flat;
	}
}

class Bounds {
	x = 0;
	y = 0;
	w = 0;
	h = 0;

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} w
	 * @param {number} h
	 */
	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}

	/**
	 * @param {Bounds} r
	 * @return {boolean}
	 */
	near(r) {
		const l = this;
		return l.x + l.w === r.x && (l.y <= r.y + r.h && l.y >= r.y || r.y <= l.y + l.h && r.y >= l.y) ||
			l.y + l.h === r.y && (l.x <= r.x + r.w && l.x >= r.x || r.x <= l.x + l.w && r.x >= l.x);
	}
}

//<editor-fold desc="generate">
const rootRoom = new Room(new Bounds(0, 0, dungeonWidth, dungeonHeight));

const gStack = [rootRoom];
while (gStack.length > 0) {
	const r = gStack.pop();
	const b = r.bounds;

	if (Math.min(b.w, b.h) < 40) {
		continue;
	}
	r.split();
	gStack.push(r.left);
	gStack.push(r.right);
}

//</editor-fold>

//<editor-fold desc="connect">

const flatRooms = rootRoom.flat();
if (0) {
	for (let i = 0; i < flatRooms.length - 1; i++) {
		for (let k = i + 1; k < flatRooms.length; k++) {
			if (flatRooms[i].bounds.near(flatRooms[k].bounds)) {
				connections.push({
					left: flatRooms[i],
					right: flatRooms[k]
				});
			}
		}
	}
} else {
	const sStack = [rootRoom];
	while (sStack.length > 0) {
		const room = sStack.pop();
		if (room === null) {
			continue;
		}
		sStack.push(room.left);
		sStack.push(room.right);

		const lf = room.left === null ? [] : room.left.flat();
		const rf = room.right === null ? [] : room.right.flat();

		a:
			for (let i = 0; i < lf.length; i++) {
				const l = lf[i];
				for (let j = 0; j < rf.length; j++) {
					const r = rf[j];
					if (l.bounds.near(r.bounds)) {
						connections.push({
							left: l,
							right: r
						});
						break a;
					}
				}
			}
	}
}

//</editor-fold>

//<editor-fold desc="room set">
const rooms = rootRoom.flat();
for (let i = 0; i < rooms.length; i++) {
	const room = rooms[i];
	const b = room.bounds;
	for (let y = b.y; y < b.h + b.y; y++) {
		for (let x = b.x; x < b.w + b.x; x++) {
			map[y * dungeonWidth + x] = x === b.x || x === b.w + b.x - 1 ||
			y === b.y || y === b.h + b.y - 1 ? tiles.WALL : tiles.FLOOR;
		}
	}
}
//</editor-fold>

//<editor-fold desc="hall">
for (let i = 0; i < connections.length; i++) {
	const room = connections[i];
	const lb = room.left.bounds;
	const rb = room.right.bounds;

	if (lb.x + lb.w === rb.x) {
		const t = Math.min(lb.y + lb.h, rb.y + rb.h);
		const b = Math.max(lb.y, rb.y);

		let diff = t - 1 - (b + 1);
		diff = rand.next() * diff | 0;
		const pos = b + diff + 1;

		let len = rb.x - (lb.x + lb.w - 1);
		for (let k = 0; k <= len; k++) {
			const _x = lb.x + lb.w - 1 + k;
			map[(pos - 1) * dungeonWidth + _x] = tiles.WALL;
			map[pos * dungeonWidth + _x] = tiles.FLOOR;
			map[(pos + 1) * dungeonWidth + _x] = tiles.WALL;
		}

	} else {
		const r = Math.min(lb.x + lb.w, rb.x + rb.w);
		const l = Math.max(lb.x, rb.x);

		let diff = r - 1 - (l + 1);
		diff = rand.next() * diff | 0;
		const pos = l + diff + 1;

		const len = rb.y - (lb.y + lb.h - 1);
		for (let k = 0; k <= len; k++) {
			const _y = lb.y + lb.h - 1 + k;
			map[_y * dungeonWidth + pos - 1] = tiles.WALL;
			map[_y * dungeonWidth + pos] = tiles.FLOOR;
			map[_y * dungeonWidth + pos + 1] = tiles.WALL;
		}
	}
}
//</editor-fold>

//<editor-fold desc="canvas">
const canvas = document.createElement('canvas');
canvas.width = dungeonWidth * cellSize;
canvas.height = dungeonHeight * cellSize;
const ctx = canvas.getContext('2d');

// draw tile
for (let y = 0; y < dungeonHeight; y++) {
	for (let x = 0; x < dungeonWidth; x++) {
		const id = map[y * dungeonWidth + x];

		if (id === 0 || id === null) {
			continue;
		}

		if (id === tiles.WALL) {
			ctx.fillStyle = 'rgb(0,70,61)';
		} else if (id === tiles.FLOOR) {
			ctx.fillStyle = 'rgb(0,0,0)';
		}

		ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
	}
}

// draw connection
ctx.strokeStyle = 'rgb(255,0,0)';
ctx.beginPath();
for (let i = 0; i < connections.length; i++) {
	const item = connections[i];

	ctx.moveTo(
		(item.left.bounds.x + item.left.bounds.w * 0.5) * cellSize,
		(item.left.bounds.y + item.left.bounds.h * 0.5) * cellSize
	);
	ctx.lineTo(
		(item.right.bounds.x + item.right.bounds.w * 0.5) * cellSize,
		(item.right.bounds.y + item.right.bounds.h * 0.5) * cellSize
	);
}
ctx.stroke();

// draw grid
ctx.beginPath();
ctx.strokeStyle = "rgba(255,255,255,0.4)";
ctx.lineWidth = .5;

for (let i = 0; i <= dungeonWidth; i++) {
	ctx.moveTo(i * cellSize, 0);
	ctx.lineTo(i * cellSize, dungeonHeight * cellSize);
}
for (let i = 0; i <= dungeonHeight; i++) {
	ctx.moveTo(0, i * cellSize);
	ctx.lineTo(dungeonWidth * cellSize, i * cellSize)
}
ctx.stroke();
ctx.closePath();

document.body.appendChild(canvas);
//</editor-fold>

export {}