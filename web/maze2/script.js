class Random {
	constructor(seed) {
		this.m_w = seed;
		this.m_z = 987654321;
		this.mask = 0xffffffff;
	}

	next() {
		this.m_z = 36969 * (this.m_z & 65535) + (this.m_z >> 16) & this.mask;
		this.m_w = 18000 * (this.m_w & 65535) + (this.m_w >> 16) & this.mask;
		let result = (this.m_z << 16) + this.m_w & this.mask;
		result /= 4294967296;
		return result + 0.5;
	}
}

const splitMod = (width, height) => {
	if (width > 2.5 * height ||
		height > 2.5 * width)
		return 1.7;
	else
		return 1.0;
};

const flatLeafBSP = tree => {
	const flat = [];
	const stack = [];
	let current = tree;

	while (stack.length > 0 || current !== undefined) {
		if (current !== undefined) {
			stack.push(current);
			current = current.left;
		} else {
			current = stack.pop();
			if (current.left === undefined && current.right === undefined)
				flat.push(current);
			current = current.right;
		}
	}

	return flat;
};

const adjacentBSP = (left, right) => {
	const flatL = flatLeafBSP(left);
	const flatR = flatLeafBSP(right);

	let found = false;
	for (let i = 0; i < flatL.length; i++) {
		if (found) break;
		const L = flatL[i];

		for (let j = 0; j < flatR.length; j++) {
			if (found) break;
			const R = flatR[j];

			if (L.bounds.x + L.bounds.width === R.bounds.x &&
				(L.bounds.y <= R.bounds.y + R.bounds.height && L.bounds.y >= R.bounds.y ||
					R.bounds.y <= L.bounds.y + L.bounds.height && R.bounds.y >= L.bounds.y)) {
				found = true;
			} else if (L.bounds.y + L.bounds.height === R.bounds.y &&
				(L.bounds.x <= R.bounds.x + R.bounds.width && L.bounds.x >= R.bounds.x ||
					R.bounds.x <= L.bounds.x + L.bounds.width && R.bounds.x >= L.bounds.x)) {
				found = true;
			}

			if (found) {
				return {
					left: L,
					right: R
				};
			}
		}
	}

	return undefined;
};

const connectBSP = bsp => {
	const stack = [];

	if (bsp.connections === undefined) {
		bsp.connections = [];
	}

	stack.push(bsp.tree);
	while (stack.length > 0) {
		const room = stack.pop();

		if (room === undefined)
			continue;

		stack.push(room.left);
		stack.push(room.right);

		const edge = adjacentBSP(room.left, room.right);
		if (edge !== undefined) {
			bsp.connections.push(edge);
		}
	}
};

const paintBSP = bsp => {
	for (let i = 0; i < bsp.width * bsp.height; i++)
		bsp.map[i] = bsp.tiles.EMPTY;

	const rooms = flatLeafBSP(bsp.tree);

	for (let i = 0; i < rooms.length; i++) {
		const room = rooms[i];

		bsp.roomPainter(room);
		if (room.size === undefined)
			room.size = {
				x: room.bounds.x,
				y: room.bounds.y,
				width: room.bounds.width,
				height: room.bounds.height
			};
	}

	for (let i = 0; i < bsp.connections.length; i++) {
		const hall = bsp.connections[i];
		bsp.hallPainter(hall.left, hall.right);
	}
};

const generateBSP = function (bsp) {
	const stack = [];
	stack.push({
		bounds: {
			x: 0,
			y: 0,
			width: bsp.width,
			height: bsp.height
		},
		left: undefined,
		right: undefined,
		parent: undefined,
		depth: 0
	});

	bsp.tree = stack[0];
	let split = 0;
	let dir = 0;
	let room = undefined;
	let width = 0;
	let height = 0;

	while (stack.length > 0) {
		room = stack.pop();

		if (room.bounds.width < bsp.roomSize * 2 &&
			room.bounds.height < bsp.roomSize * 2) {
			continue;
		}

		split = bsp.splitChance * splitMod(room.bounds.width, room.bounds.height);

		if (bsp.rand.next() > split && room.depth >= bsp.minDepth)
			continue;

		dir = bsp.splitDir(room.bounds.width, room.bounds.height);

		if (dir > 0.5) {
			width = (bsp.rand.next() * 2 - 1) * (room.bounds.width - bsp.roomSize * 2) * 0.5;
			width = room.bounds.width * 0.5 + (width | 0);

			room.left = {
				bounds: {
					x: room.bounds.x,
					y: room.bounds.y,
					width: width,
					height: room.bounds.height
				},
				left: undefined,
				right: undefined,
				parent: room,
				depth: room.depth + 1
			};

			room.right = {
				bounds: {
					x: room.bounds.x + width,
					y: room.bounds.y,
					width: room.bounds.width - width,
					height: room.bounds.height
				},
				left: undefined,
				right: undefined,
				parent: room,
				depth: room.depth + 1
			};
		} else {
			height = (bsp.rand.next() * 2 - 1) * (room.bounds.height - bsp.roomSize * 2) * 0.5;
			height = room.bounds.height * 0.5 + (height | 0);

			room.left = {
				bounds: {
					x: room.bounds.x,
					y: room.bounds.y,
					width: room.bounds.width,
					height: height
				},
				left: undefined,
				right: undefined,
				parent: room,
				depth: room.depth + 1
			};

			room.right = {
				bounds: {
					x: room.bounds.x,
					y: room.bounds.y + height,
					width: room.bounds.width,
					height: room.bounds.height - height
				},
				left: undefined,
				right: undefined,
				parent: room,
				depth: room.depth + 1
			};
		}

		stack.push(room.left);
		stack.push(room.right);
	}
};

class BSP {
	width;
	height;
	roomSize = 4;
	minDepth = 4;
	splitChance = .35;
	seed;
	map = [];
	connections = [];
	tree = undefined;
	tiles = {
		EMPTY: 0,
		WALL: 1,
		FLOOR: 2
	};

	constructor({
		width = 100,
		height = 100,
		roomSize = 4,
		seed = Date.now(),
	} = {}) {
		this.width = width;
		this.height = height;
		this.roomSize = roomSize;
		this.seed = seed;
		this.rand = new Random(this.seed);
		this.mapDef = this.tiles;
	}

	splitDir(width, height) {
		if (width >= 2.5 * height ||
			height < this.roomSize * 2)
			return 0.75;
		else if (height > 2.5 * width ||
			width < this.roomSize * 2)
			return 0.25;
		else
			return this.rand.next();
	}

	hallPainter(left, right) {
		let diff, mid;

		if (left.bounds.x + left.bounds.width === right.bounds.x) {
			// Left/right
			if (left.size.y + left.size.height - 3 < right.size.y ||
				right.size.y + right.size.height - 3 < left.size.y) {
				// Z Corridor
				const pointL = left.size.y + 1 + (this.rand.next() * (left.size.height - 2) | 0);
				const pointR = right.size.y + 1 + (this.rand.next() * (right.size.height - 2) | 0);

				if (left.bounds.height >= right.bounds.height) {
					diff = left.bounds.x + left.bounds.width - 1 - (left.size.x + left.size.width);
					mid = (this.rand.next() * diff | 0) + left.size.x + left.size.width - 1;
				} else {
					diff = right.size.x - 1 - (right.bounds.x + 1);
					mid = (this.rand.next() * diff | 0) + right.bounds.x;
				}
				let x;

				for (x = left.size.x + left.size.width - 1; x <= mid; x++) {
					if (this.map[(pointL - 1) * this.width + x] !== this.tiles.FLOOR)
						this.map[(pointL - 1) * this.width + x] = this.tiles.WALL;
					this.map[pointL * this.width + x] = this.tiles.FLOOR;
					if (this.map[(pointL + 1) * this.width + x] !== this.tiles.FLOOR)
						this.map[(pointL + 1) * this.width + x] = this.tiles.WALL;
				}

				const lMin = Math.min(pointL - 1, pointR - 1);
				const lMax = Math.max(pointL + 1, pointR + 1);

				for (let y = lMin; y <= lMax; y++) {
					if (this.map[y * this.width + x - 1] !== this.tiles.FLOOR)
						this.map[y * this.width + x - 1] = this.tiles.WALL;

					if (y !== lMin && y !== lMax)
						this.map[y * this.width + x] = this.tiles.FLOOR;
					else if (this.map[y * this.width + x] !== this.tiles.FLOOR)
						this.map[y * this.width + x] = this.tiles.WALL;

					if (this.map[y * this.width + x + 1] !== this.tiles.FLOOR)
						this.map[y * this.width + x + 1] = this.tiles.WALL;
				}

				for (; x <= right.size.x; x++) {
					if (this.map[(pointR - 1) * this.width + x] !== this.tiles.FLOOR)
						this.map[(pointR - 1) * this.width + x] = this.tiles.WALL;
					this.map[pointR * this.width + x] = this.tiles.FLOOR;
					if (this.map[(pointR + 1) * this.width + x] !== this.tiles.FLOOR)
						this.map[(pointR + 1) * this.width + x] = this.tiles.WALL;
				}
			} else {
				const t = Math.min(left.size.y + left.size.height, right.size.y + right.size.height);
				const b = Math.max(left.size.y, right.size.y);

				let diff = t - 1 - (b + 1);
				diff = this.rand.next() * diff | 0;
				const pos = b + diff + 1;

				let len = right.size.x - (left.size.x + left.size.width - 1);
				for (let k = 0; k <= len; k++) {
					const _x = left.size.x + left.size.width - 1 + k;
					this.map[(pos - 1) * this.width + _x] = this.tiles.WALL;
					this.map[pos * this.width + _x] = this.tiles.FLOOR;
					this.map[(pos + 1) * this.width + _x] = this.tiles.WALL;
				}
			}
		} else {
			// Top/Bottom
			if (left.size.x + left.size.width - 3 < right.size.x ||
				right.size.x + right.size.width - 3 < left.size.x) {
				// Z Corridor
				const pointL = left.size.x + 1 + (this.rand.next() * (left.size.width - 2) | 0);
				const pointR = right.size.x + 1 + (this.rand.next() * (right.size.width - 2) | 0);

				if (left.bounds.width >= right.bounds.width) {
					diff = (left.bounds.y + left.bounds.height) - (left.size.y + left.size.height);
					mid = (this.rand.next() * diff | 0) + left.size.y + left.size.height - 1;
				} else {
					diff = right.size.y - 1 - (right.bounds.y + 1);
					mid = (this.rand.next() * diff | 0) + right.bounds.y;
				}

				let y;

				for (y = left.size.y + left.size.height - 1; y <= mid; y++) {
					if (this.map[y * this.width + pointL - 1] !== this.tiles.FLOOR)
						this.map[y * this.width + pointL - 1] = this.tiles.WALL;
					this.map[y * this.width + pointL] = this.tiles.FLOOR;
					if (this.map[y * this.width + pointL + 1] !== this.tiles.FLOOR)
						this.map[y * this.width + pointL + 1] = this.tiles.WALL;
				}

				const lMin = Math.min(pointL - 1, pointR - 1);
				const lMax = Math.max(pointL + 1, pointR + 1);

				for (let x = lMin; x <= lMax; x++) {
					if (this.map[(y - 1) * this.width + x] !== this.tiles.FLOOR)
						this.map[(y - 1) * this.width + x] = this.tiles.WALL;

					if (x !== lMin && x !== lMax)
						this.map[y * this.width + x] = this.tiles.FLOOR;
					else if (this.map[y * this.width + x] !== this.tiles.FLOOR)
						this.map[y * this.width + x] = this.tiles.WALL;

					if (this.map[(y + 1) * this.width + x] !== this.tiles.FLOOR)
						this.map[(y + 1) * this.width + x] = this.tiles.WALL;
				}

				for (; y <= right.size.y; y++) {
					if (this.map[y * this.width + pointR - 1] !== this.tiles.FLOOR)
						this.map[y * this.width + pointR - 1] = this.tiles.WALL;
					this.map[y * this.width + pointR] = this.tiles.FLOOR;
					if (this.map[y * this.width + pointR + 1] !== this.tiles.FLOOR)
						this.map[y * this.width + pointR + 1] = this.tiles.WALL;
				}
			} else {
				const r = Math.min(left.size.x + left.size.width, right.size.x + right.size.width);
				const l = Math.max(left.size.x, right.size.x);

				let diff = r - 1 - (l + 1);
				diff = this.rand.next() * diff | 0;
				const pos = l + diff + 1;

				let len = right.size.y - (left.size.y + left.size.height - 1);
				for (let k = 0; k <= len; k++) {
					const _y = left.size.y + left.size.height - 1 + k;
					this.map[_y * this.width + pos - 1] = this.tiles.WALL;
					this.map[_y * this.width + pos] = this.tiles.FLOOR;
					this.map[_y * this.width + pos + 1] = this.tiles.WALL;
				}
			}
		}
	}

	roomPainter(room) {
		const w = this.roomSize + this.rand.next() * (room.bounds.width - this.roomSize - 2) | 0;
		const h = this.roomSize + this.rand.next() * (room.bounds.height - this.roomSize - 2) | 0;
		const x = room.bounds.x + 1 + (room.bounds.width - w - 1) * this.rand.next() | 0;
		const y = room.bounds.y + 1 + (room.bounds.height - h - 1) * this.rand.next() | 0;

		for (let _y = y; _y < h + y; _y++) {
			for (let _x = x; _x < w + x; _x++) {
				if (_x === x || _x === w + x - 1 ||
					_y === y || _y === h + y - 1) {
					this.map[_y * this.width + _x] = this.tiles.WALL;
				} else {
					this.map[_y * this.width + _x] = this.tiles.FLOOR;
				}
			}
		}

		room.size = {
			x: x,
			y: y,
			width: w,
			height: h
		};
	}
}

const bsp = new BSP({
	width: window.innerWidth,
	height: window.innerHeight,
	roomSize: 10,
	seed: Date.now()
});

generateBSP(bsp);
connectBSP(bsp);
paintBSP(bsp);

const canvas = document.createElement('canvas');
canvas.width = bsp.width;
canvas.height = bsp.height;
const ctx = canvas.getContext('2d');

ctx.strokeStyle = 'rgba(187,215,6,0.06)';
let item;
for (let i = 0; i < bsp.connections.length; i++) {
	item = bsp.connections[i];

	ctx.strokeRect(item.left.bounds.x, item.left.bounds.y,
		item.left.bounds.width, item.left.bounds.height);
	ctx.strokeRect(item.right.bounds.x, item.right.bounds.y,
		item.right.bounds.width, item.right.bounds.height);
}

for (let y = 0; y < bsp.height; y++) {
	for (let x = 0; x < bsp.width; x++) {
		const id = bsp.map[y * bsp.width + x];

		if (id === 0 || id === undefined)
			continue;

		if (id === bsp.mapDef.WALL)
			ctx.fillStyle = 'rgb(0,4,238)';
		else if (id === bsp.mapDef.FLOOR)
			ctx.fillStyle = 'rgba(211,44,119,0.2)';

		ctx.fillRect(x, y, 1, 1);
	}
}

ctx.strokeStyle = 'rgb(255,0,0)';
ctx.beginPath();
for (let i = 0; i < bsp.connections.length; i++) {
	item = bsp.connections[i];

	ctx.moveTo(item.left.size.x + item.left.size.width * 0.5,
		item.left.size.y + item.left.size.height * 0.5);
	ctx.lineTo(item.right.size.x + item.right.size.width * 0.5,
		item.right.size.y + item.right.size.height * 0.5);
}
ctx.stroke();

canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
document.body.appendChild(canvas);

export {}