import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { UserCreateDto, UserResponseDto, UserUpdateDto, UsersApi } from '../../api/generated';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(UsersApi);
  private readonly http = inject(HttpClient);

  getUsers(): Observable<UserResponseDto[]> {
    return this.api.readUsersApiV1UsersGet(0, 100);
  }

  createUser(user: UserCreateDto): Observable<UserResponseDto> {
    return this.api.createUserApiV1UsersPost(user);
  }

  updateUser(userId: number, user: UserUpdateDto): Observable<UserResponseDto> {
    return this.api.updateUserApiV1UsersUserIdPatch(userId, user);
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/users/${userId}`);
  }
}
