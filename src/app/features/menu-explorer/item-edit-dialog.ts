import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { toErrorMessage } from '../../core/menu-api';
import { MenuItem, MenuItemPatch, PRICE_MAX, PRICE_MIN } from '../../core/models';
import { maxDecimals } from '../../shared/validators';
import { MenuItemsStore } from '../../state/menu-items.store';

/** Shows an item's details and edits its price and availability. */
@Component({
  selector: 'app-item-edit-dialog',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-edit-dialog.html',
  styleUrl: './item-edit-dialog.scss',
})
export class ItemEditDialog {
  protected readonly item = inject<MenuItem>(MAT_DIALOG_DATA);
  private readonly store = inject(MenuItemsStore);
  private readonly dialogRef = inject<MatDialogRef<ItemEditDialog, MenuItem>>(MatDialogRef);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly priceMin = PRICE_MIN;
  protected readonly priceMax = PRICE_MAX;

  protected readonly form = inject(NonNullableFormBuilder).group({
    price: [
      this.item.price as number | null,
      [Validators.required, Validators.min(PRICE_MIN), Validators.max(PRICE_MAX), maxDecimals(2)],
    ],
    available: this.item.available,
  });

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  async save(): Promise<void> {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const patch = this.changes();
    if (Object.keys(patch).length === 0) {
      this.dialogRef.close();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      // The store saves through the API and updates the table and KPIs.
      const updated = await firstValueFrom(this.store.updateItem(this.item.id, patch));
      this.snackBar.open(`Saved changes to "${updated.name}"`, undefined, { duration: 3000 });
      this.dialogRef.close(updated);
    } catch (error) {
      this.saveError.set(toErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  /** Only send fields that actually changed. */
  private changes(): MenuItemPatch {
    const { price, available } = this.form.getRawValue();
    const patch: MenuItemPatch = {};
    if (price !== null && price !== this.item.price) patch.price = price;
    if (available !== this.item.available) patch.available = available;
    return patch;
  }
}
