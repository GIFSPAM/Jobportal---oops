import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';

/** One bullet in a feature list. */
interface Feature {
  text: string;
  icon: IconName;
}

const SEEKER_FEATURES: Feature[] = [
  { text: 'AI-powered job matching', icon: 'shield-check' },
  { text: 'Easy one-click applications', icon: 'shield-check' },
  { text: 'Salary benchmarking tools', icon: 'shield-check' },
];

const EMPLOYER_FEATURES: Feature[] = [
  { text: 'Advanced candidate filtering', icon: 'shield-check' },
  { text: 'Team collaboration features', icon: 'shield-check' },
  { text: 'Company branding tools', icon: 'shield-check' },
];

/**
 * Two-column "For Job Seekers" / "For Employers" marketing band.
 *
 * Static content in constants keeps the template readable; each side links into
 * the register flow just like the React `HomeFeaturesSection`.
 */
@Component({
  selector: 'app-home-features',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <section class="py-32 px-6 border-t border-[#D8D2C4] page-enter">
      <div class="max-w-7xl mx-auto">
        <div class="grid md:grid-cols-2 gap-10">
          <div class="p-12 glass-card bg-linear-to-br from-[#D4622A]/5 to-transparent border-[#D8D2C4]">
            <div
              class="w-14 h-14 rounded-2xl bg-[#D4622A]/10 flex items-center justify-center text-[#D4622A] mb-10"
            >
              <app-icon name="users" [size]="28" />
            </div>
            <h3 class="text-3xl font-display font-bold text-[#1F2A24] mb-6">For Job Seekers</h3>
            <p class="text-text-muted mb-10 leading-relaxed text-lg">
              Build your professional profile, get matched with top companies, and manage your
              applications in one place.
            </p>
            <ul class="space-y-5 mb-12">
              @for (feature of seekerFeatures; track feature.text) {
                <li class="flex items-center gap-4 text-[#1F2A24] font-medium">
                  <app-icon class="text-[#D4622A]" [name]="feature.icon" [size]="20" />
                  {{ feature.text }}
                </li>
              }
            </ul>
            <a
              routerLink="/register"
              class="w-full block text-center py-4 rounded-xl border-2 border-[#1F2A24] font-bold hover:border-[#D4622A] hover:bg-[#D4622A] hover:text-white transition-all text-[#1F2A24]"
            >
              Create Seeker Profile
            </a>
          </div>

          <div class="p-12 glass-card bg-linear-to-br from-[#2E4A38]/5 to-transparent border-[#D8D2C4]">
            <div
              class="w-14 h-14 rounded-2xl bg-[#E7EFE9] flex items-center justify-center text-[#2E4A38] mb-10 border border-[#2E4A38]/20"
            >
              <app-icon name="briefcase" [size]="28" />
            </div>
            <h3 class="text-3xl font-display font-bold text-[#1F2A24] mb-6">For Employers</h3>
            <p class="text-text-muted mb-10 leading-relaxed text-lg">
              Reach a global pool of elite talent. Post jobs, manage candidates, and build your
              dream team faster.
            </p>
            <ul class="space-y-5 mb-12">
              @for (feature of employerFeatures; track feature.text) {
                <li class="flex items-center gap-4 text-[#1F2A24] font-medium">
                  <app-icon class="text-[#2E4A38]" [name]="feature.icon" [size]="20" />
                  {{ feature.text }}
                </li>
              }
            </ul>
            <a routerLink="/register" class="btn-primary w-full block text-center py-4">
              Post a Job Now
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HomeFeaturesSectionComponent {
  /** Checkmarks listed under the seeker card. */
  readonly seekerFeatures = SEEKER_FEATURES;

  /** Checkmarks listed under the employer card. */
  readonly employerFeatures = EMPLOYER_FEATURES;
}
