import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { User } from "../dao/user-dao";

const mockFindByAuth0Id = mock<(auth0Id: string) => Promise<User | null>>(
  () => Promise.resolve(null)
);
const mockCreate = mock<
  (data: { auth0Id: string; email: string; name?: string }) => Promise<User>
>(() =>
  Promise.resolve({
    id: "",
    auth0_id: "",
    email: "",
    name: "",
    created_at: new Date(),
  })
);

mock.module("../dao/user-dao", () => ({
  userDao: {
    findByAuth0Id: mockFindByAuth0Id,
    create: mockCreate,
  },
}));

const { userService } = await import("./user-service");

describe("userService", () => {
  beforeEach(() => {
    mockFindByAuth0Id.mockReset();
    mockCreate.mockReset();
  });

  describe("findOrCreate", () => {
    it("should return existing user if found by auth0Id", async () => {
      const existingUser: User = {
        id: "123",
        auth0_id: "auth0|123",
        email: "test@example.com",
        name: "Test User",
        created_at: new Date(),
      };

      mockFindByAuth0Id.mockResolvedValue(existingUser);

      const result = await userService.findOrCreate({
        auth0Id: "auth0|123",
        email: "test@example.com",
        name: "Test User",
      });

      expect(result).toEqual({
        id: "123",
        email: "test@example.com",
        name: "Test User",
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should create new user if not found", async () => {
      const newUser: User = {
        id: "456",
        auth0_id: "auth0|456",
        email: "new@example.com",
        name: "New User",
        created_at: new Date(),
      };

      mockFindByAuth0Id.mockResolvedValue(null);
      mockCreate.mockResolvedValue(newUser);

      const result = await userService.findOrCreate({
        auth0Id: "auth0|456",
        email: "new@example.com",
        name: "New User",
      });

      expect(result).toEqual({
        id: "456",
        email: "new@example.com",
        name: "New User",
      });
      expect(mockCreate).toHaveBeenCalledWith({
        auth0Id: "auth0|456",
        email: "new@example.com",
        name: "New User",
      });
    });
  });
});
