export interface User {
	id: string;
	email: string;
	name: string;
}

export interface Transaction {
	id: string;
	recipient: {
		id: string;
		name: string | null;
		email: string;
	};

	amount: number;
	currency: string;
	status: "pending_otp" | "confirmed" | "sent" | "failed";
	createdAt: string;
}

export type ApiResponse<T> = {
	data: T;
	message?: string;
	error?: string;
};
