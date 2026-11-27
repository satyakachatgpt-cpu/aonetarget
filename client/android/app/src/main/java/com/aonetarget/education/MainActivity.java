package com.aonetarget.education;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallState;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "PlayAppUpdate";
    private static final int UPDATE_REQUEST_CODE = 9912;
    private AppUpdateManager appUpdateManager;
    private InstallStateUpdatedListener installStateUpdatedListener;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        initPlayStoreUpdate();
    }

    private void initPlayStoreUpdate() {
        try {
            appUpdateManager = AppUpdateManagerFactory.create(this);

            installStateUpdatedListener = new InstallStateUpdatedListener() {
                @Override
                public void onStateUpdate(InstallState state) {
                    if (state.installStatus() == InstallStatus.DOWNLOADED) {
                        Log.d(TAG, "Update downloaded, completing update...");
                        if (appUpdateManager != null) {
                            appUpdateManager.completeUpdate();
                        }
                    }
                }
            };
            appUpdateManager.registerListener(installStateUpdatedListener);

            appUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
                Log.d(TAG, "Play Store Update availability: " + appUpdateInfo.updateAvailability() +
                        ", available version code: " + appUpdateInfo.availableVersionCode());

                if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE) {
                    if (appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                        try {
                            appUpdateManager.startUpdateFlowForResult(
                                appUpdateInfo,
                                this,
                                AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
                                UPDATE_REQUEST_CODE
                            );
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to start flexible update: " + e.getMessage());
                        }
                    } else if (appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                        try {
                            appUpdateManager.startUpdateFlowForResult(
                                appUpdateInfo,
                                this,
                                AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
                                UPDATE_REQUEST_CODE
                            );
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to start immediate update: " + e.getMessage());
                        }
                    }
                }
            }).addOnFailureListener(e -> {
                Log.d(TAG, "InAppUpdate check info: " + e.getMessage());
            });
        } catch (Exception e) {
            Log.e(TAG, "InAppUpdate error: " + e.getMessage());
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (appUpdateManager != null) {
            appUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
                if (appUpdateInfo.installStatus() == InstallStatus.DOWNLOADED) {
                    appUpdateManager.completeUpdate();
                } else if (appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                    try {
                        appUpdateManager.startUpdateFlowForResult(
                            appUpdateInfo,
                            this,
                            AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
                            UPDATE_REQUEST_CODE
                        );
                    } catch (Exception e) {
                        Log.e(TAG, "Resume update error: " + e.getMessage());
                    }
                }
            });
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (appUpdateManager != null && installStateUpdatedListener != null) {
            appUpdateManager.unregisterListener(installStateUpdatedListener);
        }
    }
}
