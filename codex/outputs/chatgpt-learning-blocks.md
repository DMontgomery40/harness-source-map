# ChatGPT learning blocks

Learning blocks are the interactive math, physics, chemistry, biology and data visualizations ChatGPT shows next to an answer: a graph, a 3D scene or an animation, often with sliders and switches the user can change. This build ships **1621 block types**, 1592 with a view registered: 22 three.js 3D scenes, 761 Lottie animations and 809 other views (neither three.js nor Lottie). 784 have an animated Lottie thumbnail, 160 stand for a named formula, and 451 take parameters the server can set.

Source: ChatGPT desktop 26.1002.52244 (build 13536), `app.asar` → `webview/assets/`: the block registry `analytics-15ea16e918ba.js` (1665 registered views), 1006 manifest modules (`type-*.js`) and the type enum `chatgpt_math_blocks-75ddf978e7bd.js`.

## How a block reaches the conversation

- A block arrives as a **content reference** on an assistant message, category `learning_block`. Its data names the block (`matched_type`), the widget (`widget_type`), the server's block version (`server_learning_block_version`) and the starting parameter values (`encoded_initial_values`). The model's answer text is not changed; the app renders the matched block beside it, inline or as a card (`display_mode`).
- The render source the app reports for these blocks is `CHATGPT_MATH_BLOCK_RENDER_SOURCE_GENUI_LEARNING_BLOCK`: the server's generative-UI layer matched the answer to a block type. The app does not choose blocks itself.
- Formula blocks carry a `canonicalFormula` (and some `canonicalFormulaAliases`) in their manifest. The app uses the formula only as display text: it shows it when the reference's `content_type` is `canonical_formula` or `placeholder`, and otherwise shows the content the server sent. No app code reads the aliases, so no matching of the model's equations happens in the app.
- Feedback on a block is posted to `POST /conversation/message/learning-blocks/feedback` with the matched type, the rendered and server block versions, the initial values, whether the user edited the block, and the chosen reasons.
- A block can offer follow-up questions. Choosing one sends a new user message whose metadata marks it `followups_v2_followup_source: "learning_block_suggested_followup"`, so the request records that the question came from a block.
- Generative-UI widgets on a message that are still being completed are polled through `POST /conversation/{conversation_id}/message/{message_id}/genui/refresh_widget` (message metadata `genui_refresh`).
- Analytics actions: `CODEX_LEARNING_BLOCK_ACTION_IMPRESSION`, `_FALLBACK`, `_FOLLOW_UP_SHOWN`, `_FOLLOW_UP_SELECTED`, `_FEEDBACK_OPENED`, `_FEEDBACK_SUBMITTED` and `_FEEDBACK_FAILED`.

Counting: a block type is one manifest `type` (or, for a view whose manifest is inline in the registry, its analytics type); where a type ships more than one view or manifest version, the highest version is listed. The type enum (`CHATGPT_MATH_BLOCK_TYPE_*`) has 962 values; 126 of them have no registered view or manifest in this build (`ABSOLUTE_VALUE_DISTANCE`, `ADULT_CPR_AED_SEQUENCE`, `ALCOHOL_OXIDATION`, `APPLYING_A_SCREEN_PROTECTOR`, `APPLYING_CAULK`, `APPLYING_SUNSCREEN`, `ASTHMA_AIRWAY_FLOW`, `BACTERIAL_GROWTH_CURVE`, `BASKETBALL_LAYUP`, `BOHR_MODEL`, `BOND_ENTHALPY`, `BOWLINE_KNOT`, …; all are in the JSON). Blocks registered without an analytics type (`UNSPECIFIED`) are identified by their manifest. 384 blocks have no separate manifest module (378 of them are defined inside the registry chunk); their parameters are not listed here. 1 manifest modules could not be evaluated and are listed from their literals only. A title is the block's thumbnail animation name where it has one, otherwise its type name in words; the sentence under it is the view's own accessibility label.

## Blocks

### three.js 3D scenes (22)

#### Column space: `A\mathbf{x}\in\operatorname{span}(A)`

Type `COLUMN_SPACE` · manifest v1 · formula `A\mathbf{x}\in\operatorname{span}(A)`, also `\operatorname{Col}(A)=\operatorname{span}\{\mathbf{a}_1,\mathbf{a}_2,\mathbf{a}_3\}`.

Parameters: `rank` (integer, default `1`, range 1 to 3); `inputX` (number, default `1`, range -1.5 to 1.5); `inputY` (number, default `0`, range -1.5 to 1.5); `inputZ` (number, default `0`, range -1.5 to 1.5).

Source: manifest `model-44d6ee3a3108.js`; view `visualization-82012faf0eca.js` → `ColumnSpaceVisualization`.

#### Cylindrical coordinates: `\int_{a_z}^{b_z}\int_{a_{\theta}}^{b_{\theta}}\int_{a_r}^{b_r}r\,dr\,d\theta\,dz`

Type `CYLINDRICAL_COORDINATES` · manifest v1 · formula `\int_{a_z}^{b_z}\int_{a_{\theta}}^{b_{\theta}}\int_{a_r}^{b_r}r\,dr\,d\theta\,dz`.

Parameters: `rStart` (number, default `0`, range 0 to 5); `r` (number, default `3`, range 0 to 5); `thetaStart` (number, default `0`, range 0 to 6.283185307179586); `theta` (number, default `6.283185307179586`, range 0 to 6.283185307179586); `zStart` (number, default `0`, range 0 to 5); `z` (number, default `3`, range 0 to 5); `shape` (enum, default `cylinder`, one of `cylinder`, `sector`, `cylindrical-shell`).

Source: manifest `content-c9925bc5b917.js`; view `visualization-aa87e7977e27.js` → `CylindricalCoordinatesVisualization`.

#### Divergence theorem flux: `\iint_{\partial V}\mathbf F\cdot\mathbf n\,dS=\iiint_V\nabla\cdot\mathbf F\,dV`

Type `DIVERGENCE_THEOREM_FLUX` · manifest v1 · formula `\iint_{\partial V}\mathbf F\cdot\mathbf n\,dS=\iiint_V\nabla\cdot\mathbf F\,dV`.

Parameters: `radius` (number, default `1.35`, range 0.8 to 1.9); `strength` (number, default `0.75`, range -1.2 to 1.2).

Source: manifest `type-a59f58f3e3e0.js`; view `visualization-e76b54725ea6.js` → `DivergenceTheoremFluxVisualization`.

#### Double integral cartesian

Type `DOUBLE_INTEGRAL_CARTESIAN`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-5803ed78c0a3.js` → `CartesianDoubleIntegralVisualization`.

#### Gradient directional derivative: `D_{\mathbf u}f=\nabla f\cdot\mathbf u`

Type `GRADIENT_DIRECTIONAL_DERIVATIVE` · manifest v1 · formula `D_{\mathbf u}f=\nabla f\cdot\mathbf u`.

Parameters: `angle` (number, default `35`, range 0 to 360); `pointX` (number, default `1`, range -2.2 to 2.2); `pointY` (number, default `0.65`, range -1.6 to 1.6).

Source: manifest `type-977bdfa6cb63.js`; view `visualization-7c4cfc4f79eb.js` → `GradientDirectionalDerivativeVisualization`.

#### Jacobian grid transformation: `dA=\left|\det J\right|\,du\,dv`

Type `JACOBIAN_GRID_TRANSFORMATION` · manifest v1 · formula `dA=\left|\det J\right|\,du\,dv`.

Parameters: `scale` (number, default `1.4`, range 0.7 to 2); `shear` (number, default `0.6`, range -0.95 to 0.95).

Source: manifest `type-f72a37ec91c5.js`; view `visualization-a0f4bb4f14c5.js` → `JacobianGridTransformationVisualization`.

#### Lagrange gradient parallelism: `\nabla f=\lambda\nabla g`

Type `LAGRANGE_GRADIENT_PARALLELISM` · manifest v1 · formula `\nabla f=\lambda\nabla g`.

Parameters: `example` (enum, default `linear`, one of `linear`, `product`, `ellipse`); `angleDegrees` (number, default `30`, range 0 to 360).

Source: manifest `model-b583204f43e9.js`; view `visualization-d153458bc3dd.js` → `LagrangeGradientParallelismVisualization`.

#### Line integral work

Type `LINE_INTEGRAL_WORK`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ae6622d34343.js` → `LineIntegralWorkVisualization`.

#### Multivariable limit paths: `f(x,y)=\frac{x^2-y^2}{x^2+y^2}`

Type `MULTIVARIABLE_LIMIT_PATHS` · manifest v1 · formula `f(x,y)=\frac{x^2-y^2}{x^2+y^2}`.

Parameters: `mode` (enum, default `dne`, one of `dne`, `exists`); `path` (enum, default `y-zero`, one of `y-zero`, `x-zero`); `distance` (number, default `0.75`, range 0 to 1.2).

Source: manifest `model-2e64cf87fd64.js`; view `visualization-78eba8c9076a.js` → `MultivariableLimitPathsVisualization`.

#### Null space: `A\mathbf{x}=\mathbf{0}`

Type `NULL_SPACE` · manifest v1 · formula `A\mathbf{x}=\mathbf{0}`, also `\operatorname{Null}(A)=\ker(A)`.

Parameters: `rank` (integer, default `1`, range 1 to 3).

Source: manifest `model-b86e7b9561e2.js`; view `visualization-2f28cee231c7.js` → `NullSpaceVisualization`.

#### Parametrized line 2d

Line-integral parameter {parameter}

Type `PARAMETRIZED_LINE_2D` · manifest v1 (also v1).

Parameters: `t` (number, default `0`, range -12.566370614359172 to 12.566370614359172).

Source: manifest `model-e5ade770ac2f.js`; view `visualization-9a23516ec049.js` → `LineIntegralVisualization`.

#### Parametrized line 3d

Curve parameter {parameter}

Type `PARAMETRIZED_LINE_3D` · manifest v1.

Parameters: `t` (number, default `0`, range -12.566370614359172 to 12.566370614359172).

Source: manifest `model-2139461cc43f.js`; view `visualization-cc8212e9b8b4.js` → `ParametrizedLine3DVisualization`.

#### Parametrized surfaces

Type `PARAMETRIZED_SURFACES` · manifest v1.

Parameters: `t` (number, default `1`, range -2 to 2); `s` (number, default `1.5707963267948966`, range -6.283185307179586 to 6.283185307179586).

Source: manifest `model-a4f0614d0c79.js`; view `visualization-aae7c9c8d9d7.js` → `ParametrizedSurfacesVisualization`.

#### Power iteration

Type `POWER_ITERATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-8b9292190724.js` → `PowerIterationVisualization`.

#### Shifted inverse iteration: `\mathbf{x}_{k+1}=\frac{B\mathbf{x}_k}{\lVert B\mathbf{x}_k\rVert}`

Type `SHIFTED_INVERSE_ITERATION` · manifest v1 · formula `\mathbf{x}_{k+1}=\frac{B\mathbf{x}_k}{\lVert B\mathbf{x}_k\rVert}`.

Parameters: `mode` (enum, default `shifted`, one of `shifted`, `inverse`, `shifted_inverse`).

Source: manifest `model-7393bb1ed478.js`; view `visualization-f220979664fe.js` → `ShiftedInverseIterationVisualization`.

#### Solar system

Type `SOLAR_SYSTEM`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a3fd0a16a6cd.js` → `SolarSystemVisualization`.

#### Spherical coordinates: `\int_{a_p}^{b_p}\int_{a_{\phi}}^{b_{\phi}}\int_{a_{\theta}}^{b_{\theta}}p^2\sin\phi\,d\theta\,d\phi\,dp`

Type `SPHERICAL_COORDINATES` · manifest v1 · formula `\int_{a_p}^{b_p}\int_{a_{\phi}}^{b_{\phi}}\int_{a_{\theta}}^{b_{\theta}}p^2\sin\phi\,d\theta\,d\phi\,dp`.

Parameters: `p` (number, default `3`, range 0 to 5); `phi` (number, default `3.141592653589793`, range 0 to 3.141592653589793); `theta` (number, default `6.283185307179586`, range 0 to 6.283185307179586); `radialInnerFraction` (number, default `0`, range 0 to 1); `polarLowerFraction` (number, default `0`, range 0 to 1); `azimuthalLowerFraction` (number, default `0`, range 0 to 1); `shape` (enum, default `sphere`, one of `sphere`, `cone`, `donut`).

Source: manifest `content-cd9720b3fd21.js`; view `visualization-3551b93a0e40.js` → `SphericalCoordinatesVisualization`.

#### Surface level curves

Type `SURFACE_LEVEL_CURVES` · manifest v1.

Parameters: `axis` (enum, default `z`, one of `x`, `y`, `z`); `level` (number, default `1`, range -2 to 2).

Source: manifest `model-8407dd056273.js`; view `visualization-2eaa6efa2944.js` → `SurfaceLevelCurvesVisualization`.

#### Tangent plane linearization: `\small f(x_0,y_0)+\nabla f(x_0,y_0)\cdot{\langle x-x_0,y-y_0\rangle}`

Type `TANGENT_PLANE_LINEARIZATION` · manifest v1 · formula `\small f(x_0,y_0)+\nabla f(x_0,y_0)\cdot{\langle x-x_0,y-y_0\rangle}`.

Parameters: `contactX` (number, default `0.65`, range -1.2 to 1.2); `contactY` (number, default `-0.45`, range -1.2 to 1.2).

Source: manifest `type-3e5d3f81a72e.js`; view `visualization-dce023fd46b6.js` → `TangentPlaneLinearizationVisualization`.

#### Triple integral cartesian

Type `TRIPLE_INTEGRAL_CARTESIAN`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-780d902259a6.js` → `CartesianTripleIntegralVisualization`.

#### Vector field curl divergence: `\begin{aligned}\operatorname{div}\mathbf F&=\nabla\cdot\mathbf F\\\operatorname{curl}\mathbf F&=\nabla\times\mathbf F\end{aligned}`

Type `VECTOR_FIELD_CURL_DIVERGENCE` · manifest v1 · formula `\begin{aligned}\operatorname{div}\mathbf F&=\nabla\cdot\mathbf F\\\operatorname{curl}\mathbf F&=\nabla\times\mathbf F\end{aligned}`.

Parameters: `field` (enum, default `rotation`, one of `source`, `sink`, `rotation`, `saddle`); `strength` (number, default `0.85`, range 0.35 to 1.45).

Source: manifest `type-2a06847ff944.js`; view `visualization-9150602065d7.js` → `VectorFieldCurlDivergenceVisualization`.

#### Vsepr geometry

Type `VSEPR_GEOMETRY` · manifest v1.

Parameters: `configuration` (enum, default `AX4`, one of `AX2`, `AX3`, `AX2E`, `AX4`, `AX3E`, `AX2E2`, `AX5`, `AX4E`, `AX3E2`, `AX2E3`, `AX6`, `AX5E`, `AX4E2`, `AX3E3`, `AX2E4`).

Source: manifest `model-cde8f9761457.js`; view `visualization-a267d346c26c.js` → `VseprGeometryVisualization`.

### Lottie animations (761)

#### A and B antigen products expressed together on one AB red blood cell

Type `CODOMINANCE_ALLELE_EXPRESSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-545276c09013.js`; view `visualization-43a48f53ef16.js` → `CodominanceAlleleExpressionVisualization`.

#### A basal body anchors one motile cilium across the plasma membrane

Explain how a basal body anchors a motile cilium at the plasma membrane and how its nine microtubule triplets continue into the cilium's nine outer doublets.

Type `BASAL_BODY_CILIUM_ANCHORING` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-99041db0e99c.js`; view `visualization-9b9e738c753e.js` → `Visualization`.

#### A biological stain reveals the same previously faint cell nucleus

Type `MICROSCOPY_STAINING_SPECIMEN_CONTRAST` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-fff586ba396e.js`; view `visualization-a4a0de5fd752.js` → `Visualization`.

#### A competitive inhibitor occupies the substrate's own active site

Type `ENZYME_COMPETITIVE_INHIBITION_BINDING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-79be525c7666.js`; view `visualization-f7b023697943.js` → `Visualization`.

#### A complementary microRNA binds an existing mature mRNA, suppresses translation or promotes RNA degradation, and reduces protein output after transcription.

Type `MICRORNA_MRNA_TRANSLATIONAL_SILENCING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f4498f9db9f3.js`; view `visualization-7433a3961713.js` → `Visualization`.

#### A complementary substrate fits an enzyme's specific active site

Type `ENZYME_ACTIVE_SITE_SPECIFICITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2b7c325e1fe8.js`; view `visualization-c2d6c03a2cd4.js` → `Visualization`.

#### A confined tumor stays above an intact boundary while invasive cells cross it

Type `BENIGN_VERSUS_INVASIVE_TUMOR_BOUNDARY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4287ce92608f.js`; view `visualization-fb252aff585b.js` → `Visualization`.

#### A fixed recessive pp tester distinguishes PP from Pp dominant-phenotype parents

Type `MENDELIAN_TEST_CROSS_GENOTYPE_INFERENCE` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-1bf8bcff530f.js`; view `visualization-8afb9d7addc0.js` → `Visualization`.

#### A lac-operon example aligns a CAP activator site, promoter, operator, and three structural genes that share one polycistronic mRNA.

Type `PROKARYOTIC_OPERON_ARCHITECTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8a019b8d6e07.js`; view `visualization-c6bd523e83fb.js` → `Visualization`.

#### A local developmental signal induces neighboring-cell gene expression and fate

Developmental cell-fate induction: a signaling source sends a local signal to a neighboring target cell, which activates neuronal genes and becomes a neuron while preserving its original genome.

Type `DEVELOPMENTAL_CELL_FATE_INDUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7d1f02258b02.js`; view `visualization-6400ae393174.js` → `Visualization`.

#### A local regulator reaches a nearby receptor-bearing cell

A signaling cell secretes one local regulator that diffuses a short distance and activates the matching receptor of a nearby target cell.

Type `PARACRINE_CELL_SIGNALING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1276c3670217.js`; view `visualization-893bd11a3df1.js` → `ParacrineCellSignalingVisualization`.

#### A migratory bird follows seasonal photoperiod and resource cues

Type `SEASONAL_MIGRATION_ENVIRONMENTAL_CUES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7f09749cfe46.js`; view `visualization-3637334e8805.js` → `SeasonalMigrationEnvironmentalCuesVisualization`.

#### A pancreas senses high glucose and a distinct effector lowers it

High blood glucose is detected by the pancreas, insulin signals an insulin-responsive skeletal muscle target, and glucose uptake lowers the same blood-glucose deviation toward normal.

Type `FEEDBACK_SENSOR_AND_EFFECTOR_ROLES` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-fbf512d18a6c.js`; view `visualization-261fb0107dba.js` → `FeedbackSensorAndEffectorRolesVisualization`.

#### A recognizable common precursor differentiates into nerve and muscle cells

Type `MULTICELLULAR_CELL_DIFFERENTIATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ee3b981a0c54.js`; view `visualization-72422798ead7.js` → `Visualization`.

#### A rooted shoot bends toward directional light through growth

Type `PLANT_PHOTOTROPISM_DIRECTIONAL_GROWTH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-eaa20eefe63b.js`; view `visualization-6e5f24ba6379.js` → `PlantPhototropismDirectionalGrowthVisualization`.

#### A separate allosteric inhibitor reduces catalytic capacity without occupying the active site

Type `ENZYME_NONCOMPETITIVE_INHIBITION_ALLOSTERIC` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4a167c68f228.js`; view `visualization-b520e86f498f.js` → `Visualization`.

#### A short-day plant flowers after a sufficiently long uninterrupted night

Type `PLANT_PHOTOPERIOD_SEASONAL_FLOWERING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9699a92ce5d3.js`; view `visualization-38a42ed87108.js` → `PlantPhotoperiodSeasonalFloweringVisualization`.

#### A surface receptor responds while its water-soluble ligand stays outside

A water-soluble extracellular signal binds a cell-surface receptor without entering the cell, and the receptor-bearing target responds.

Type `CELL_SURFACE_RECEPTOR_RECOGNITION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1286b1e030b2.js`; view `visualization-d9dbebd90227.js` → `CellSurfaceReceptorRecognitionVisualization`.

#### A traveling peristaltic muscle wave propels one food bolus

Digestive peristalsis animation: one intact food bolus stays within a continuous horizontal digestive lumen while circular smooth muscle contracts behind it, the segment ahead relaxes, and the same bolus moves forward without relying on gravity.

Type `ANIMAL_DIGESTIVE_PERISTALSIS_AND_FOOD_TRANSPORT` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-7e0ee9100ae8.js`; view `visualization-4add101bd712.js` → `AnimalDigestivePeristalsisAndFoodTransportVisualization`.

#### ABA versus gibberellin seed dormancy

Type `ABA_VERSUS_GIBBERELLIN_SEED_DORMANCY` · manifest v1 (also v1, v1, v1) · animated thumbnail · not in the type enum.

Source: manifest `type-888603d16da6.js`; view `visualization-762a052c0d50.js` → `Visualization`.

#### Abundant tryptophan binds an inactive trp repressor, enabling the complex to occupy the operator and stop tryptophan-biosynthesis transcription.

Type `TRP_OPERON_COREPRESSOR_SWITCH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-11defa77e1c6.js`; view `visualization-80bee6ccf0fa.js` → `Visualization`.

#### Acid strength versus concentration

Type `BIOLOGICAL_ACID_STRENGTH_VERSUS_CONCENTRATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-414481fae786.js`; view `visualization-99f6383a583d.js` → `Visualization`.

#### Acidic lysosomal digestion remains separate from near-neutral cytosol

Type `COMPARTMENT_MICROENVIRONMENTS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-e2cd7c8e14b2.js`; view `visualization-bd14d3243d7e.js` → `Visualization`.

#### Acoelomate, pseudocoelomate, and coelomate

Type `ANIMAL_ACOELOMATE_PSEUDOCOELOMATE_COELOMATE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-94770f08d250.js`; view `visualization-99c8bb7ed568.js` → `AnimalAcoelomatePseudocoelomateCoelomateVisualization`.

#### Actin filament polymerization

Explain how actin monomers joining a filament's barbed end can advance the adjacent plasma membrane.

Type `ACTIN_FILAMENT_POLYMERIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7e1d6c4d3594.js`; view `visualization-fe3687b1a50a.js` → `Visualization`.

#### Actin treadmilling preserves filament length during subunit turnover

Explain actin treadmilling as barbed-end addition balanced by pointed-end loss while identifiable subunits move through an approximately constant-length filament.

Type `ACTIN_FILAMENT_TREADMILLING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8bf5d00b3eb9.js`; view `visualization-e13b029fbd03.js` → `Visualization`.

#### Actin-driven cell migration

Trace how leading-edge protrusion, new adhesion, actomyosin contraction, and rear release combine to move a cell across a substrate.

Type `ACTIN_DRIVEN_CELL_MIGRATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c16e7f85108b.js`; view `visualization-3eab786bf5ac.js` → `Visualization`.

#### Action-potential depolarization and repolarization

One neuronal voltage trace reaches threshold. Sodium enters through voltage-gated channels to cause depolarization; potassium leaves to cause repolarization, a brief hyperpolarizing undershoot, and return to the resting potential.

Type `ACTION_POTENTIAL_DEPOLARIZATION_AND_REPOLARIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-bd392aa3db83.js`; view `visualization-f80f112c91d8.js` → `ActionPotentialDepolarizationAndRepolarizationVisualization`.

#### Activated oncogene growth signal compared with lost tumor-suppressor brake

Type `ONCOGENE_VERSUS_TUMOR_SUPPRESSOR_LOSS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-bff75777a396.js`; view `visualization-a68e2c3e37a7.js` → `Visualization`.

#### active-habitat-restoration-population-recovery

Type `ACTIVE_HABITAT_RESTORATION_POPULATION_RECOVERY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-97671b1f6834.js`; view `visualization-4731b4ba29d8.js` → `ActiveHabitatRestorationPopulationRecoveryVisualization`.

#### Acute inflammation and neutrophil recruitment

How does acute inflammation recruit a neutrophil from blood into infected tissue? Connect local inflammatory signaling, vascular leakage, neutrophil movement out of blood vessels, and directed migration to the rapid delivery of innate defenses into infected tissue.

Type `IMMUNE_ACUTE_INFLAMMATION_NEUTROPHIL_RECRUITMENT` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-2ff2490776d8.js`; view `visualization-83e631fd4c7d.js` → `ImmuneAcuteInflammationNeutrophilRecruitmentVisualization`.

#### Adaptation and environmental fitness

Type `ADAPTATION_ENVIRONMENTAL_FITNESS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8978b1113585.js`; view `visualization-de6370f0cde3.js` → `AdaptationEnvironmentalFitnessVisualization`.

#### Adenylyl cyclase converts ATP into intracellular cAMP that activates protein kinase A

cAMP second-messenger animation: an extracellular ligand activates a receptor and adenylyl cyclase, ATP becomes multiple intracellular cAMP molecules, and cAMP activates protein kinase A and its target.

Type `CAMP_SECOND_MESSENGER_RELAY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2595d26b3297.js`; view `visualization-9ba9c39e4a59.js` → `Visualization`.

#### ADH osmoregulation neuroendocrine loop

Type `ADH_OSMOREGULATION_NEUROENDOCRINE_LOOP` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3727660a2c24.js`; view `visualization-20f758aa79d9.js` → `Visualization`.

#### ADH water balance negative feedback

Type `ADH_WATER_BALANCE_NEGATIVE_FEEDBACK` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2a967b7defda.js`; view `visualization-e08aac6bf96c.js` → `AdhWaterBalanceNegativeFeedbackVisualization`.

#### Adjacent plant membranes, cellulose walls, and middle lamella

Two neighboring plant cells with plasma membranes inside separate cellulose-rich primary walls and a shared middle lamella between the walls.

Type `PLANT_CELL_WALL_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cb73f889e16d.js`; view `visualization-fc169181a4f4.js` → `Visualization`.

#### Aerobic, facultative, and anaerobic bacteria share one oxygen gradient

Type `BACTERIAL_OXYGEN_REQUIREMENTS_AND_GROWTH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-451f45882761.js`; view `visualization-9bfc85700cc4.js` → `BacterialOxygenRequirementsAndGrowthVisualization`.

#### agricultural-nutrient-management-runoff-tradeoffs

Type `AGRICULTURAL_NUTRIENT_MANAGEMENT_RUNOFF_TRADEOFFS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5eebf8396a1b.js`; view `visualization-ca1ace3010db.js` → `AgriculturalNutrientManagementRunoffTradeoffsVisualization`.

#### Aldehyde versus ketone carbonyl placement

Type `BIOLOGICAL_CARBONYL_ALDEHYDE_VERSUS_KETONE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-92b2050a1f27.js`; view `visualization-20c205d107cb.js` → `Visualization`.

#### Algal photosynthesis and oxygen production

Type `ALGAL_PHOTOSYNTHESIS_OXYGEN_PRODUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a1c7352f47a1.js`; view `visualization-1e81712000c4.js` → `Visualization`.

#### All four DNA-template-to-RNA complementary transcription pairs

Type `DNA_TEMPLATE_RNA_COMPLEMENTARITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-20662f220b13.js`; view `visualization-9805c8a64218.js` → `DnaTemplateRnaComplementarityVisualization`.

#### All-or-none action-potential threshold

A subthreshold stimulus produces no action potential; both threshold-level and stronger stimuli produce action-potential spikes of the same amplitude.

Type `ALL_OR_NONE_ACTION_POTENTIAL_THRESHOLD` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ba20d22de16e.js`; view `visualization-3db1d8342361.js` → `AllOrNoneActionPotentialThresholdVisualization`.

#### Allolactose inactivates the operator-bound LacI repressor, allowing RNA polymerase to transcribe the lac structural genes.

Type `LAC_OPERON_INDUCER_REPRESSION_SWITCH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ccd61b53bbb0.js`; view `visualization-799a391be34f.js` → `Visualization`.

#### Allopatric geographic separation versus sympatric shared habitat

The upper allopatric habitat is split by a continuous river; the lower sympatric habitat remains unbroken while its populations experience a reproductive gene-flow barrier.

Type `ALLOPATRIC_VERSUS_SYMPATRIC_SPECIATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-88a050f8fd8d.js`; view `visualization-9e8c6c57e023.js` → `AllopatricVersusSympatricSpeciationVisualization`.

#### Alpha helices and beta sheets

Type `PROTEIN_SECONDARY_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4964ed0b7591.js`; view `visualization-130d082e74bf.js` → `ProteinSecondaryStructureVisualization`.

#### Alternative RNA-splicing isoforms

Type `ALTERNATIVE_RNA_SPLICING_ISOFORMS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f192ed5b50f7.js`; view `visualization-7b5442136a53.js` → `Visualization`.

#### Amino-acid carboxyl, amino, and zwitterion states

Type `BIOLOGICAL_CARBOXYL_AMINO_ZWITTERION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4574a5c56f9f.js`; view `visualization-c18d1e62f151.js` → `Visualization`.

#### Amino-acid charge states across pH

Type `BIOLOGICAL_AMINO_ACID_PH_DEPENDENT_CHARGE_STATES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5b4c0775832e.js`; view `visualization-10a4b3ce615b.js` → `Visualization`.

#### Amino-acid molecular structure

Type `AMINO_ACID_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-58a5e07040d8.js`; view `visualization-be294c8d1889.js` → `AminoAcidStructureVisualization`.

#### Amniotic egg and extraembryonic membranes

Amniotic egg and extraembryonic membranes: An amniotic egg encloses an embryo within a fluid-filled amnion, provides nutrients through a yolk sac, and includes an allantois extending toward the outer layer.

Type `ANIMAL_AMNIOTIC_EGG_MEMBRANES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b23f5a244906.js`; view `visualization-420a88b2a4d1.js` → `AnimalAmnioticEggMembranesVisualization`.

#### Amniotic egg structure

Type `VERTEBRATE_AMNIOTIC_EGG_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ea66978c4070.js`; view `visualization-1c0441760c6b.js` → `Visualization`.

#### Amoeba phagocytosis

Type `AMOEBA_PHAGOCYTOSIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f0cbe3382bff.js`; view `visualization-74981de8b5d8.js` → `Visualization`.

#### An affected aa child proves both unaffected pedigree parents are Aa carriers

Type `MENDELIAN_AUTOSOMAL_RECESSIVE_PEDIGREE_CARRIER_INFERENCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4d9f48837c76.js`; view `visualization-12e336e911fa.js` → `Visualization`.

#### An affected X-linked dominant father transmits his affected X to every daughter and no son

Type `X_LINKED_DOMINANT_FATHER_DAUGHTER_TRANSMISSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c705ba5329ea.js`; view `visualization-7ebb238ab57e.js` → `XLinkedDominantFatherDaughterTransmissionVisualization`.

#### An ectotherm cools by choosing a shaded environmental microhabitat

Type `BEHAVIORAL_THERMOREGULATION_MICROHABITAT_CHOICE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-776db5ea682f.js`; view `visualization-b1e0fcc004c6.js` → `BehavioralThermoregulationMicrohabitatChoiceVisualization`.

#### An enhancer-bound transcriptional activator loops one continuous DNA molecule toward a promoter, recruits RNA polymerase, and increases mRNA output.

Type `EUKARYOTIC_ENHANCER_PROMOTER_LOOPING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9d5acd2c2812.js`; view `visualization-5fdc8c819b03.js` → `Visualization`.

#### Angiosperm double fertilization

Follow two haploid sperm through one pollen tube into a flowering-plant ovule: one fuses with the haploid egg to form a diploid zygote, while the other joins two haploid polar nuclei to form triploid endosperm.

Type `ANGIOSPERM_DOUBLE_FERTILIZATION_EMBRYO_AND_ENDOSPERM` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-cbad57cb2e22.js`; view `visualization-ab7c6c2a503b.js` → `AngiospermDoubleFertilizationEmbryoAndEndospermVisualization`.

#### Angiosperm flowers, fruit, and enclosed seeds

Trace one recognizable flower and its enclosed ovule through pollen landing, pollen-tube sperm delivery, fertilization, and development of that same ovary into a seed-containing fruit.

Type `ANGIOSPERM_FLOWER_FERTILIZATION_FRUIT_AND_SEEDS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-90bfb33d04c2.js`; view `visualization-5a29900dc487.js` → `AngiospermFlowerFertilizationFruitAndSeedsVisualization`.

#### Animal body axes and cephalization

Type `ANIMAL_BODY_AXES_AND_CEPHALIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d16e0a53fad2.js`; view `visualization-574afcfcda90.js` → `AnimalBodyAxesAndCephalizationVisualization`.

#### Animal cell structure and function

Type `ANIMAL_CELL_STRUCTURE_AND_FUNCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1b2e670dbd36.js`; view `visualization-81e779f121dd.js` → `Visualization`.

#### Animal digestive tract organ sequence

Digestive tract anatomy with one continuous meal route from the mouth through the esophagus and stomach, into the nutrient-absorbing small intestine, and finally into the water-recovering colon.

Type `ANIMAL_DIGESTIVE_TRACT_ORGAN_SEQUENCE` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-d0c6c533fe7a.js`; view `visualization-f2679b5803a1.js` → `AnimalDigestiveTractOrganSequenceVisualization`.

#### Animal diversity and body plans

Type `ANIMAL_DIVERSITY_AND_BODY_PLANS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a683f46ddd5d.js`; view `visualization-57b20a1157ee.js` → `AnimalDiversityAndBodyPlansVisualization`.

#### Animal excretion and osmoregulation

Type `ANIMAL_EXCRETION_AND_OSMOREGULATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-913cfe23625b.js`; view `visualization-e847672e4d70.js` → `AnimalExcretionAndOsmoregulationVisualization`.

#### Animal extracellular-matrix components and integrin attachment

Animal cell with extracellular collagen fibers, a branched proteoglycan, and fibronectin linked through a membrane-spanning integrin to intracellular actin.

Type `EXTRACELLULAR_MATRIX_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1c3c1e0e2d72.js`; view `visualization-a971c34721c5.js` → `Visualization`.

#### Animal respiration uses food and oxygen and releases energy and waste

An animal uses food and oxygen to release usable energy while carbon dioxide and water leave as material waste.

Type `RESPIRATION_FOOD_OXYGEN_ENERGY_WASTE_OVERVIEW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-806e954231f8.js`; view `visualization-729b9835c173.js` → `Visualization`.

#### Animal tight junctions seal, desmosomes anchor, and gap junctions connect

Two neighboring animal cells share an upper tight junction that seals, a middle desmosome that anchors intermediate filaments, and a lower gap junction that connects their cytoplasms.

Type `ANIMAL_CELL_JUNCTION_FUNCTIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6f6a8749d4cc.js`; view `visualization-e80c2b74ef81.js` → `Visualization`.

#### Animal tissues, integument, and barrier repair

Type `ANIMAL_TISSUES_INTEGUMENT_AND_BARRIER_REPAIR` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6e4674121c5a.js`; view `visualization-7f334ccf89f2.js` → `AnimalTissuesIntegumentAndBarrierRepairVisualization`.

#### Animal-cell cytokinesis divides cytoplasm after nuclear division

Type `ANIMAL_CELL_CYTOKINESIS_CLEAVAGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cb11e0c6fd49.js`; view `visualization-ee7060eaa117.js` → `Visualization`.

#### Animal-cell swelling, balance, and shrinking across three tonicities

Type `ANIMAL_CELL_TONICITY_COMPARISON` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-f3dba7d97d54.js`; view `visualization-e8f11976d2f5.js` → `Visualization`.

#### Annelid peristaltic locomotion

Type `ANIMAL_ANNELID_PERISTALTIC_LOCOMOTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7c7eccb9eb6a.js`; view `visualization-8d502b441af2.js` → `AnimalAnnelidPeristalticLocomotionVisualization`.

#### Ant pheromone trail and food recruitment

Type `ANIMAL_PHEROMONE_TRAIL_RECRUITMENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-af499b718fd6.js`; view `visualization-75a0ba755328.js` → `Visualization`.

#### Antagonistic elbow flexion and extension

Type `MUSCULOSKELETAL_ANTAGONISTIC_ELBOW_FLEXION_EXTENSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2997e16bf52b.js`; view `visualization-70efe1a75183.js` → `MusculoskeletalAntagonisticElbowFlexionExtensionVisualization`.

#### Antibiotic selection of resistant bacteria

Type `ANTIBIOTIC_SELECTION_RESISTANT_BACTERIA` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-802b4dd6e13b.js`; view `visualization-df1ec586e1ed.js` → `AntibioticSelectionResistantBacteriaVisualization`.

#### Antibody heavy chains, light chains, Fab, and Fc

How do an antibody's heavy and light chains create Fab binding arms and an Fc effector stem? Relate the two heavy chains and two light chains of an antibody monomer to its identical Fab antigen-binding sites, flexible hinge, and heavy-chain Fc effector region.

Type `ANTIBODY_HEAVY_LIGHT_CHAIN_FAB_FC_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-40eeb111c0e1.js`; view `visualization-66407adda958.js` → `AntibodyHeavyLightChainFabFcStructureVisualization`.

#### Antibody specificity and neutralization

Why does only a matching antibody block viral attachment? Explain how antigen-binding specificity allows a matching antibody to neutralize an extracellular virion by occupying a required host-attachment site.

Type `ANTIBODY_SPECIFICITY_AND_ANTIGEN_NEUTRALIZATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-ea3f8f53184e.js`; view `visualization-549d35407f13.js` → `AntibodySpecificityAndAntigenNeutralizationVisualization`.

#### Antigen presentation pathways

Why do MHC I and MHC II activate different T cells? Distinguish endogenous peptide presentation by MHC class I to CD8 cytotoxic T cells from exogenous peptide presentation by MHC class II to CD4 helper T cells.

Type `ANTIGEN_PRESENTATION_PATHWAYS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-97e3fb15672b.js`; view `visualization-cec26960164f.js` → `AntigenPresentationPathwaysVisualization`.

#### Antigen-specific clonal selection and expansion

How does one antigen select and expand its matching lymphocyte clone? Explain why only an antigen-matched lymphocyte undergoes clonal expansion and differentiates into effector and memory descendants with the same specificity.

Type `ANTIGEN_SPECIFIC_CLONAL_SELECTION_AND_EXPANSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-982dd19b2dc9.js`; view `visualization-3f9c9fc3073e.js` → `AntigenSpecificClonalSelectionAndExpansionVisualization`.

#### Antiparallel AUG codon and UAC tRNA anticodon pairing

Type `CODON_ANTICODON_PAIRING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9769188bb6a1.js`; view `visualization-8104106ac16c.js` → `CodonAnticodonPairingVisualization`.

#### Antiparallel DNA strands

Two complementary DNA strands run antiparallel through a twisting double helix: one strand runs from 5-prime to 3-prime while its partner runs from 3-prime to 5-prime.

Type `ANTIPARALLEL_DNA_STRANDS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cfba3c82c3af.js`; view `visualization-1fcbedcd3d8a.js` → `Visualization`.

#### Antiparallel template and daughter polarity

Type `DNA_REPLICATION_ANTIPARALLEL_TEMPLATE_POLARITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-51b2e3398223.js`; view `visualization-361e4e9c2368.js` → `DnaReplicationAntiparallelTemplatePolarityVisualization`.

#### Apical dominance auxin and cytokinin

Type `APICAL_DOMINANCE_AUXIN_CYTOKININ` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6c3282e07d05.js`; view `visualization-2b46dac14d7e.js` → `Visualization`.

#### Artery, vein, and capillary structure comparison

Static vessel comparison: an artery has a thick wall and narrower lumen, a vein has a thinner wall, wider lumen, and one-way valve, and a capillary has a thin exchange wall beside a body cell.

Type `ANIMAL_ARTERY_VEIN_CAPILLARY_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-652df7b8cca1.js`; view `visualization-830b88baaab4.js` → `AnimalArteryVeinCapillaryStructureVisualization`.

#### Arthropod body plan and jointed appendages

Type `ANIMAL_ARTHROPOD_BODY_PLAN_JOINTED_APPENDAGES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-153bd2ef9e5e.js`; view `visualization-8f1f859ee672.js` → `AnimalArthropodBodyPlanJointedAppendagesVisualization`.

#### Artificial selection and selective breeding

Type `ARTIFICIAL_SELECTION_SELECTIVE_BREEDING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-942f711e0087.js`; view `visualization-627e2e33307e.js` → `ArtificialSelectionSelectiveBreedingVisualization`.

#### Asexual plant propagation by runners

A parent flowering plant extends a horizontal above-ground runner, roots form at its node, and a connected new daughter plant grows without pollination or seed formation

Type `PLANT_ASEXUAL_RUNNER_PROPAGATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2c26d444906d.js`; view `visualization-269936852ca7.js` → `Visualization`.

#### Asymmetric stem-cell division renews one stem cell and differentiates its sibling

Asymmetric stem-cell division and self-renewal: one stem cell produces a daughter that retains stem-cell identity and a sibling that differentiates into a neuron, while both daughters inherit the same genome.

Type `STEM_CELL_ASYMMETRIC_DIVISION_AND_SELF_RENEWAL` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-689b3aa08e59.js`; view `visualization-eb0d733628e2.js` → `Visualization`.

#### Atmospheric nitrogen, root-nodule bacteria, soil nitrogen, and feeding

How does atmospheric nitrogen become available to plants and then enter animals? Explain that nitrogen-fixing microbes convert atmospheric nitrogen gas into biologically available soil nitrogen before producers assimilate it and consumers acquire it by feeding.

Type `BIOGEOCHEMICAL_NITROGEN_FIXATION_AND_ASSIMILATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-54c26514e9b7.js`; view `visualization-613c72242ce6.js` → `Visualization`.

#### ATP and ADP preserve adenosine while one phosphate changes attachment

ATP and ADP structure comparison: both molecules retain the same adenosine scaffold; ATP has three attached phosphate groups, while ADP has two and a separate conserved inorganic phosphate.

Type `ATP_ADP_PHOSPHATE_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-fb2a1f973b3d.js`; view `visualization-675981ba36f8.js` → `AtpAdpPhosphateStructureVisualization`.

#### ATP hydrolysis transfers one phosphate and metabolic energy regenerates ATP

ATP hydrolysis and regeneration animation: one conserved terminal phosphate leaves ATP as cellular work occurs, then energy input returns that same phosphate to ADP and regenerates ATP.

Type `ATP_HYDROLYSIS_AND_REGENERATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8300643c305a.js`; view `visualization-5308932272ef.js` → `AtpHydrolysisAndRegenerationVisualization`.

#### ATP phosphorylation activates a substrate and enables a new chemical bond

ATP-coupled chemical work animation: the same terminal ATP phosphate transfers to a substrate, creating an activated intermediate that enables a new product bond.

Type `PHOSPHORYLATION_COUPLED_CELLULAR_WORK` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2d1673cb9409.js`; view `visualization-46db29435138.js` → `PhosphorylationCoupledCellularWorkVisualization`.

#### ATP synthase chemiosmosis

Type `ATP_SYNTHASE_CHEMIOSMOSIS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-6cbf6f94a417.js`; view `visualization-ba712502bb6c.js` → `AtpSynthaseChemiosmosisVisualization`.

#### ATP-dependent cross-bridge cycle

Type `MUSCULOSKELETAL_ATP_CROSS_BRIDGE_CYCLE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-39a8560c3bfb.js`; view `visualization-d32aa2bead21.js` → `MusculoskeletalAtpCrossBridgeCycleVisualization`.

#### ATP-derived phosphate activates a membrane pump before against-gradient ion transport

ATP-driven active transport animation: ATP-derived phosphate activates a membrane pump, then one identifiable ion moves through its pore from lower concentration to higher concentration.

Type `ATP_DRIVEN_ACTIVE_TRANSPORT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c7ea28e4ea8e.js`; view `visualization-57f88ea8852e.js` → `AtpDrivenActiveTransportVisualization`.

#### Auditory hair-cell sensory transduction

Type `SENSORY_AUDITORY_HAIR_CELL_TRANSDUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9870c8ab5420.js`; view `visualization-7984949fc573.js` → `Visualization`.

#### Autophagy encloses damaged cargo for lysosomal recycling

Type `AUTOPHAGY_LYSOSOME_RECYCLING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-678887ccf7d8.js`; view `visualization-2e94aee4ed04.js` → `Visualization`.

#### Autosomal dominant vertical transmission contrasted with recessive transmission through an unaffected carrier generation

Type `MENDELIAN_AUTOSOMAL_DOMINANT_VERSUS_RECESSIVE_PEDIGREE_PATTERNS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8f7ed7ae3194.js`; view `visualization-12aa7ea59a67.js` → `Visualization`.

#### Autosomal father-to-son transmission contrasted with paternal X-to-daughter transmission

Type `MENDELIAN_AUTOSOMAL_VERSUS_X_LINKED_PEDIGREE_TRANSMISSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-71af11eb5df9.js`; view `visualization-8dcdec132748.js` → `Visualization`.

#### Auxin acid-growth cell elongation

Type `AUXIN_ACID_GROWTH_CELL_ELONGATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1805cba087c8.js`; view `visualization-08237051486c.js` → `Visualization`.

#### B-cell plasma-cell antibody secretion

How does an activated B cell produce protective antibodies? Connect antigen-specific B-cell activation to plasma-cell differentiation and secretion of antibodies with the same recognition specificity.

Type `B_CELL_PLASMA_CELL_ANTIBODY_SECRETION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b5c2097cd130.js`; view `visualization-aee284e0c5bc.js` → `BCellPlasmaCellAntibodySecretionVisualization`.

#### Bacterial and animal cells share core structures but differ in nuclear organization

Bacterial and animal cells both have a membrane, cytoplasm, DNA, and ribosomes. Bacterial DNA is not enclosed in a nucleus, while animal-cell DNA is enclosed within a nucleus.

Type `CELL_THEORY_PROKARYOTIC_AND_EUKARYOTIC_CELLS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2984118d783e.js`; view `visualization-13ca5ed57898.js` → `Visualization`.

#### Bacterial batch-culture growth phases

Type `BACTERIAL_BATCH_CULTURE_GROWTH_PHASES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f5bd8d82824c.js`; view `visualization-ec09d5d05624.js` → `BacterialBatchCultureGrowthPhasesVisualization`.

#### Bacterial binary fission

Type `BACTERIAL_BINARY_FISSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-22c63a9cd888.js`; view `visualization-7c838ad80f44.js` → `BacterialBinaryFissionVisualization`.

#### Bacterial cell envelope and accessory structures

Type `BACTERIAL_CELL_ENVELOPE_AND_ACCESSORY_STRUCTURES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a79469a0080a.js`; view `visualization-9121b2f8741e.js` → `BacterialCellEnvelopeAndAccessoryStructuresVisualization`.

#### Bacterial cell shapes and arrangements

Type `BACTERIAL_CELL_SHAPES_AND_ARRANGEMENTS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ba757dc9e400.js`; view `visualization-a5c264206ac5.js` → `BacterialCellShapesAndArrangementsVisualization`.

#### Bacterial conjugation and plasmid transfer

Type `BACTERIAL_CONJUGATION_PLASMID_TRANSFER` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-da50844dbb13.js`; view `visualization-bbef5d7be939.js` → `BacterialConjugationPlasmidTransferVisualization`.

#### Bacterial horizontal gene transfer routes

Type `BACTERIAL_HORIZONTAL_GENE_TRANSFER_ROUTES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4842463d2b9c.js`; view `visualization-767fb8ee7daf.js` → `BacterialHorizontalGeneTransferRoutesVisualization`.

#### Bacterial operons and eukaryotic chromatin, transcription, and RNA processing regulate the unchanged pathway from DNA to RNA to protein.

Type `GENE_EXPRESSION_REGULATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5205086ad8f2.js`; view `visualization-2bd04f93a0de.js` → `Visualization`.

#### Bacterial population density triggers a shared quorum-sensing response

Type `BACTERIAL_QUORUM_SENSING_DENSITY_THRESHOLD` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-c03b23303f20.js`; view `visualization-b069a5bbb2f9.js` → `BacterialQuorumSensingDensityThresholdVisualization`.

#### Bacterial prophage induction

Type `BACTERIAL_PROPHAGE_INDUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-58c4175b99e7.js`; view `visualization-3471323d2d2f.js` → `BacterialProphageInductionVisualization`.

#### Bacterial transformation and antibiotic selection

Two comparable bacterial hosts face equal visibly counted antibiotic doses; only the plasmid-positive cell contains the marked resistance gene and survives, while the plasmid-negative host is inhibited.

Type `BACTERIAL_TRANSFORMATION_ANTIBIOTIC_SELECTION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-1a2c38f9cd50.js`; view `visualization-4dd358fd9b6c.js` → `Visualization`.

#### Bacterial transformation and free DNA uptake

Type `BACTERIAL_TRANSFORMATION_FREE_DNA_UPTAKE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-42af29e28dc1.js`; view `visualization-62a828eacfaf.js` → `BacterialTransformationFreeDnaUptakeVisualization`.

#### Bacteriophage attachment and genome injection

Type `BACTERIOPHAGE_ATTACHMENT_AND_GENOME_INJECTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-10a9f2c0fc13.js`; view `visualization-e328e01ec225.js` → `BacteriophageAttachmentAndGenomeInjectionVisualization`.

#### Bacteriophage lysogeny and prophage inheritance

Type `BACTERIOPHAGE_LYSOGENY_AND_PROPHAGE_INHERITANCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-909470642d06.js`; view `visualization-75c532a58ac5.js` → `BacteriophageLysogenyAndProphageInheritanceVisualization`.

#### Bacteriophage lytic replication and lysis

Type `BACTERIOPHAGE_LYTIC_REPLICATION_AND_LYSIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3d08c7be808d.js`; view `visualization-c75e0cdfd519.js` → `BacteriophageLyticReplicationAndLysisVisualization`.

#### Bacteriophage lytic versus lysogenic pathways

Type `BACTERIOPHAGE_LYTIC_VERSUS_LYSOGENIC_PATHWAYS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-ffec32f63499.js`; view `visualization-f4ac973b926e.js` → `BacteriophageLyticVersusLysogenicPathwaysVisualization`.

#### Bacteriophage structure and host recognition

Type `BACTERIOPHAGE_STRUCTURE_AND_HOST_RECOGNITION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ab95f7c62d15.js`; view `visualization-ef8add86bbf8.js` → `BacteriophageStructureAndHostRecognitionVisualization`.

#### Bacteriophage transduction of bacterial genes

Type `BACTERIOPHAGE_TRANSDUCTION_BACTERIAL_GENE_TRANSFER` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-77cc63d10a98.js`; view `visualization-c78c87ca5f87.js` → `BacteriophageTransductionBacterialGeneTransferVisualization`.

#### Basal melanocytes transfer protective melanin

Type `EPIDERMAL_MELANOCYTE_MELANIN_UV_PROTECTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6d75a72828bb.js`; view `visualization-c1fd1c108dec.js` → `EpidermalMelanocyteMelaninUvProtectionVisualization`.

#### Bidirectional replication forks

Type `DNA_REPLICATION_ORIGIN_BIDIRECTIONAL_FORKS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2eab92721c8d.js`; view `visualization-7afc63be031f.js` → `DnaReplicationOriginBidirectionalForksVisualization`.

#### Bile emulsifies fat before lipase digests exposed droplet surfaces

Fat digestion animation: bile first disperses one large fat droplet into multiple smaller droplets with greater combined surface, then lipase acts at those droplet surfaces and releases smaller digestion products; bile is not an enzyme.

Type `ANIMAL_BILE_EMULSIFICATION_AND_FAT_DIGESTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2d8109ac9cd3.js`; view `visualization-322fe916fad6.js` → `AnimalBileEmulsificationAndFatDigestionVisualization`.

#### Biological acid-base proton transfer

Type `BIOLOGICAL_ACID_BASE_PROTON_TRANSFER` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9c1e4e00b6d6.js`; view `visualization-b42a00be1035.js` → `Visualization`.

#### Biological bicarbonate buffer equilibrium

Type `BIOLOGICAL_BICARBONATE_BUFFER_EQUILIBRIUM` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7be157d7b26f.js`; view `visualization-842ca6fe734b.js` → `Visualization`.

#### Biological buffer capacity and exhaustion

Type `BIOLOGICAL_BUFFER_CAPACITY_AND_EXHAUSTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-69b19a38a764.js`; view `visualization-8fbf3beaa166.js` → `Visualization`.

#### Biological buffer conjugate pair

Type `BIOLOGICAL_BUFFER_CONJUGATE_PAIR` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8eeb77b86b9e.js`; view `visualization-9db7768b8c90.js` → `Visualization`.

#### Biological buffer response to added acid

Type `BIOLOGICAL_BUFFER_ADDED_ACID_RESPONSE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-64bc0103213d.js`; view `visualization-157d1fa82c2e.js` → `Visualization`.

#### Biological buffer response to added base

Type `BIOLOGICAL_BUFFER_ADDED_BASE_RESPONSE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-acd416fdb720.js`; view `visualization-9e85c5692ef8.js` → `Visualization`.

#### Biological calibration curve and unknown concentration

Type `BIOLOGICAL_CALIBRATION_CURVE_AND_UNKNOWN_CONCENTRATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b35c39150721.js`; view `visualization-300936594057.js` → `BiologicalCalibrationCurveAndUnknownConcentrationVisualization`.

#### Biological pH scale and tenfold proton changes

Type `BIOLOGICAL_PH_SCALE_TENFOLD_PROTON_CHANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-688c92b9a52f.js`; view `visualization-2993962a3e8f.js` → `Visualization`.

#### Biological pH, pKa, and protonation states

Type `BIOLOGICAL_PH_PKA_PROTONATION_STATES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f1b3351f62a6.js`; view `visualization-8dff0fe8ce34.js` → `Visualization`.

#### Biological serial dilution and concentration

Type `BIOLOGICAL_SERIAL_DILUTION_AND_CONCENTRATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7187246792b9.js`; view `visualization-a7b6a01de189.js` → `BiologicalSerialDilutionAndConcentrationVisualization`.

#### Biotechnology methods

One DNA-centered biotechnology map shows four countable PCR copies, three size-separated gel bands, a conspicuous donor-bearing plasmid inside a bacterial host, and a recognizable guide-directed Cas9 beside its cut DNA product.

Type `BIOTECHNOLOGY` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-ac7b8cda010c.js`; view `visualization-2943deb9f71e.js` → `Visualization`.

#### Birds nested within reptiles

Type `VERTEBRATE_BIRDS_NESTED_WITHIN_REPTILES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-938843672aa6.js`; view `visualization-a077ca39e4b6.js` → `Visualization`.

#### Births, deaths, immigration, and emigration

Type `POPULATION_ECOLOGY_DEMOGRAPHIC_CHANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4f8dca8d977d.js`; view `visualization-7a9f8f78f596.js` → `Visualization`.

#### Blastocyst implantation and cell lineages

Blastocyst implantation and cell lineages: A mammalian blastocyst contains an outer trophoblast, a fluid-filled cavity, and an inner cell mass. During implantation the trophoblast contacts and invades the endometrium and contributes to the fetal component of the placenta, while the inner cell mass develops into the embryo.

Type `ANIMAL_BLASTOCYST_IMPLANTATION_CELL_LINEAGES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ce928739d071.js`; view `visualization-100b3b6bf0b4.js` → `AnimalBlastocystImplantationCellLineagesVisualization`.

#### Both plants and animals use food and oxygen for respiration

A whole plant and a whole animal both use food and oxygen for respiration, releasing energy, carbon dioxide, and water.

Type `PLANTS_AND_ANIMALS_BOTH_RESPIRE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-919f80337893.js`; view `visualization-d104b56fac1d.js` → `Visualization`.

#### Branching timeline of major biological transitions

Type `BRANCHING_TIMELINE_OF_MAJOR_BIOLOGICAL_TRANSITIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-89d21841567a.js`; view `visualization-d8c7a50e7cc5.js` → `BranchingTimelineOfMajorBiologicalTransitionsVisualization`.

#### Bread mold sporangium spore release

Type `BREAD_MOLD_SPORANGIUM_SPORE_RELEASE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-47746364e6cc.js`; view `visualization-3cca24483191.js` → `Visualization`.

#### Brightfield versus phase-contrast imaging of one unstained live cell

Type `MICROSCOPY_PHASE_CONTRAST_LIVE_CELLS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d42c0dca9d86.js`; view `visualization-8ed655372994.js` → `Visualization`.

#### Butterfly complete metamorphosis

Butterfly complete metamorphosis: an egg becomes a caterpillar larva, then a chrysalis pupa, then an adult butterfly that produces new eggs.

Type `ORGANISM_BUTTERFLY_COMPLETE_METAMORPHOSIS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-742afae4dfb8.js`; view `visualization-c08243d53ebb.js` → `OrganismButterflyCompleteMetamorphosisVisualization`.

#### Calcium, troponin, and tropomyosin

Type `MUSCULOSKELETAL_CALCIUM_TROPONIN_TROPOMYOSIN` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3707ba102b13.js`; view `visualization-bcabb6c57dfa.js` → `MusculoskeletalCalciumTroponinTropomyosinVisualization`.

#### Calvin cycle: carbon dioxide, RuBP, G3P, and regenerated RuBP

Type `PHOTOSYNTHESIS_CALVIN_CYCLE_CARBON_FIXATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-f142f4215cdc.js`; view `visualization-c1d3185fece7.js` → `Visualization`.

#### Cambrian animal body-plan diversification

Type `CAMBRIAN_ANIMAL_BODY_PLAN_DIVERSIFICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b439c29dc06d.js`; view `visualization-3f7aa64c4b14.js` → `CambrianAnimalBodyPlanDiversificationVisualization`.

#### Carbohydrate structure and function

Type `CARBOHYDRATE_STRUCTURE_FUNCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3ed86fb590b6.js`; view `visualization-9bd1b89d6f90.js` → `Visualization`.

#### Carbohydrates overview

Type `CARBOHYDRATES_OVERVIEW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f11541ad36ff.js`; view `visualization-e8dbd78e7c17.js` → `Visualization`.

#### Carbon dioxide right-shifts the hemoglobin oxygen affinity curve

Bohr-effect comparison: normal and high-carbon-dioxide lower-pH hemoglobin saturation curves share the same axes; the high-carbon-dioxide curve shifts right, has lower saturation at one identical tissue oxygen availability, and therefore releases more oxygen to active tissue.

Type `ANIMAL_BOHR_EFFECT_AND_OXYGEN_UNLOADING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8d29529847e2.js`; view `visualization-b916a0bfd291.js` → `AnimalBohrEffectAndOxygenUnloadingVisualization`.

#### Carbon dioxide, bicarbonate transport, and blood pH

Carbon dioxide and blood-pH animation: carbon dioxide from body tissue enters blood, reversibly forms bicarbonate and a buffered hydrogen ion during transport, then bicarbonate and hydrogen ion recombine at the lungs before carbon dioxide leaves; more hydrogen ions are associated with lower pH.

Type `ANIMAL_CARBON_DIOXIDE_BICARBONATE_AND_PH` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-bebbb05ab922.js`; view `visualization-48f68f07e295.js` → `AnimalCarbonDioxideBicarbonateAndPhVisualization`.

#### Carbon from air becomes plant sugar and new leaf tissue

Carbon dioxide enters a plant leaf, and the same carbon becomes part of sugar and newly growing leaf tissue.

Type `PLANT_GROWTH_CARBON_FROM_AIR` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ee194e125de6.js`; view `visualization-6da8efcde774.js` → `Visualization`.

#### Carbon reservoirs and fluxes

Where is carbon stored, and which pathways move it among air, organisms, soil, and water? Distinguish major carbon reservoirs from the biological and physical fluxes that transfer the same carbon among them.

Type `BIOGEOCHEMICAL_CARBON_RESERVOIRS_AND_FLUXES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3287a0c0c401.js`; view `visualization-9273cc1da3e1.js` → `Visualization`.

#### carbon-budget-emission-reduction-and-sink-restoration

Type `CARBON_BUDGET_EMISSION_REDUCTION_AND_SINK_RESTORATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-319095e210a6.js`; view `visualization-331d7301392a.js` → `CarbonBudgetEmissionReductionAndSinkRestorationVisualization`.

#### carbon-cycle-anthropogenic-imbalance

Type `CARBON_CYCLE_ANTHROPOGENIC_IMBALANCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2b6dbe275ed6.js`; view `visualization-5c481b6f4cea.js` → `CarbonCycleAnthropogenicImbalanceVisualization`.

#### Carrier mother and unaffected father produce one affected X-linked son

Type `X_LINKED_RECESSIVE_INHERITANCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8c8ad4f8dce7.js`; view `visualization-e4dc678500f3.js` → `XLinkedRecessiveInheritanceVisualization`.

#### Cell specialization: same genome, different cellular identities

Cell specialization: nerve, muscle, and protein-secretory cells share the same DNA but express different genes and have different structures and functions.

Type `CELL_SPECIALIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2848b8bd66c0.js`; view `visualization-4c45939e485e.js` → `Visualization`.

#### Cell theory: living things, cellular units, and existing-cell lineage

Animal, plant, and bacterial cells show that all living things consist of cells and that a cell is the basic unit of life; one existing parent cell leads to two daughter cells.

Type `CELL_THEORY_EVIDENCE_AND_SCALE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5489280ca726.js`; view `visualization-624bd35a1192.js` → `Visualization`.

#### Cell-cycle phases and regulation overview

Type `CELL_CYCLE_AND_REGULATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c0c1b64d21f0.js`; view `visualization-2666b3559f42.js` → `Visualization`.

#### Cell-size surface area, volume, and SA:V comparison

Type `CELL_SIZE_SURFACE_AREA_TO_VOLUME` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-831f7c46dd63.js`; view `visualization-63563a2ae293.js` → `CellSizeSurfaceAreaToVolumeVisualization`.

#### Cell-specific transcription factors activate matching genes in the same genome

Cell-specific transcription factors: a nerve cell and muscle cell retain the same regulatory DNA, but different matching transcription factors activate different target genes.

Type `CELL_TYPE_SPECIFIC_TRANSCRIPTION_FACTORS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4f9c4bf41a5b.js`; view `visualization-9e86324cc5be.js` → `Visualization`.

#### Cell-surface movement and cytoskeleton

Explain how actin filaments, microtubules, and intermediate filaments organize a cell and support intracellular transport and cell-surface movement.

Type `CELL_SURFACE_MOVEMENT_AND_CYTOSKELETON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6cf922fb666d.js`; view `visualization-9c63785c2495.js` → `Visualization`.

#### Cellular respiration pathway overview

Type `CELLULAR_RESPIRATION_PATHWAY_OVERVIEW` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-ac534fbf2909.js`; view `visualization-1b83b6617b26.js` → `CellularRespirationPathwayOverviewVisualization`.

#### Cellular structure and functions

Type `CELLULAR_STRUCTURE_AND_FUNCTIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cca2d1279025.js`; view `visualization-798a6ec287d0.js` → `Visualization`.

#### Central and peripheral nervous-system organization

The brain and spinal cord form the central nervous system. The peripheral nervous system carries sensory input inward and branches into somatic and autonomic motor output.

Type `NERVOUS_SYSTEM_CENTRAL_PERIPHERAL_ORGANIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9c47921fc211.js`; view `visualization-bb11d25dd447.js` → `NervousSystemCentralPeripheralOrganizationVisualization`.

#### Checkpoint failure inherits DNA damage through repeated cell division

Type `CHECKPOINT_FAILURE_UNCONTROLLED_PROLIFERATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8a0ed2c5e436.js`; view `visualization-db9cffdcf0ad.js` → `Visualization`.

#### Chemical-synapse neurotransmitter release

A presynaptic action potential opens a calcium channel. Calcium enters, a neurotransmitter-filled vesicle fuses with the presynaptic membrane, transmitter crosses the synaptic cleft, and a postsynaptic receptor produces a local response.

Type `CHEMICAL_SYNAPSE_NEUROTRANSMITTER_RELEASE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6d9e9c0bd954.js`; view `visualization-2ff4a33b4c1d.js` → `ChemicalSynapseNeurotransmitterReleaseVisualization`.

#### Chloroplast structure and photosynthesis

Type `CHLOROPLAST_STRUCTURE_AND_PHOTOSYNTHESIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3ee19e5c3b04.js`; view `visualization-52020912d9fe.js` → `Visualization`.

#### Cholesterol buffers cool packing and warm membrane motion

Type `CHOLESTEROL_MEMBRANE_FLUIDITY` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-fe38f4b848ea.js`; view `visualization-212e3c90b14b.js` → `CholesterolMembraneFluidityVisualization`.

#### Chromosome-21 nondisjunction produces a 24-chromosome gamete; fertilization by a normal 23-chromosome gamete produces trisomy 21

Type `MEIOTIC_NONDISJUNCTION_FERTILIZATION_TRISOMY` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-f023a589001e.js`; view `visualization-b635ff5bcd12.js` → `Visualization`.

#### Cilia versus microvilli

Distinguish motile microtubule-based cilia that move material from shorter actin-supported microvilli that increase absorptive surface area.

Type `CILIA_VERSUS_MICROVILLI` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-45f2294a8894.js`; view `visualization-933b9e78633a.js` → `Visualization`.

#### Ciliary power and recovery stroke

Explain how a motile cilium's effective power stroke and bent recovery stroke create net movement of material over a cell surface.

Type `CILIARY_POWER_AND_RECOVERY_STROKE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1fc17825b632.js`; view `visualization-9156e4981d61.js` → `Visualization`.

#### Circadian melatonin neuroendocrine pathway

Type `CIRCADIAN_MELATONIN_NEUROENDOCRINE_PATHWAY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c488b3fb18f1.js`; view `visualization-6206999ba700.js` → `Visualization`.

#### Citric acid cycle carbon and carriers

Type `CITRIC_ACID_CYCLE_CARBON_AND_CARRIERS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-191aa237339d.js`; view `visualization-4b097cf39bcc.js` → `CitricAcidCycleCarbonAndCarriersVisualization`.

#### climate-disruption-coral-bleaching

Type `CLIMATE_DISRUPTION_CORAL_BLEACHING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1eaf975bddf6.js`; view `visualization-6c374072ab97.js` → `ClimateDisruptionCoralBleachingVisualization`.

#### climate-disruption-species-range-shift

Type `CLIMATE_DISRUPTION_SPECIES_RANGE_SHIFT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5dea8a6cd756.js`; view `visualization-757a7516735f.js` → `ClimateDisruptionSpeciesRangeShiftVisualization`.

#### Cnidarian nematocyst discharge

Type `ANIMAL_CNIDARIAN_NEMATOCYST_DISCHARGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5d401172ede9.js`; view `visualization-7507b5dc2555.js` → `AnimalCnidarianNematocystDischargeVisualization`.

#### Cnidarian polyp versus medusa

Type `ANIMAL_CNIDARIAN_POLYP_VERSUS_MEDUSA` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8ffd188b1903.js`; view `visualization-9da68c502d63.js` → `AnimalCnidarianPolypVersusMedusaVisualization`.

#### Cochlear tonotopic pitch mapping

Type `SENSORY_COCHLEAR_TONOTOPIC_PITCH_MAPPING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-435abf75f508.js`; view `visualization-f95cca370bf1.js` → `Visualization`.

#### Coding and template DNA strands determine transcription direction

Type `GENE_CODING_TEMPLATE_STRAND_ORIENTATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-0d5a93fdaa3f.js`; view `visualization-5e51b7683a29.js` → `GeneCodingTemplateStrandOrientationVisualization`.

#### Coding strand template strand and RNA comparison

Type `CODING_TEMPLATE_RNA_STRAND_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cd83bfb62ac5.js`; view `visualization-6b81aadbefee.js` → `Visualization`.

#### Commensalism nesting partnership

Type `COMMENSALISM_NESTING_PARTNERSHIP` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7503dd5d9f07.js`; view `visualization-bb0c4cf79265.js` → `CommensalismNestingPartnershipVisualization`.

#### Comparative vertebrate embryology

Type `EVOLUTION_COMPARATIVE_EMBRYOLOGY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-615085e849cf.js`; view `visualization-4188027ae371.js` → `EvolutionComparativeEmbryologyVisualization`.

#### Compare internal metabolic heat and external environmental heat

Type `ENDOTHERM_ECTOTHERM_HEAT_SOURCE_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c3fe6c2472a2.js`; view `visualization-6281ea19ace3.js` → `EndothermEctothermHeatSourceComparisonVisualization`.

#### Compare oriented taxis with nondirectional kinesis

Type `TAXIS_VERSUS_KINESIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c3ff970cc858.js`; view `visualization-998c3bf5bd52.js` → `TaxisVersusKinesisVisualization`.

#### Compare phylogenetic relatedness

Type `PHYLOGENETIC_RELATEDNESS_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-dfa112eb3084.js`; view `visualization-cbffad5c32e4.js` → `Visualization`.

#### Competitive and pure noncompetitive inhibition have distinct rate limits

Type `ENZYME_INHIBITION_KINETICS_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-215b73e31187.js`; view `visualization-b62fb076381d.js` → `Visualization`.

#### Complement opsonization

How do complement tags make a pathogen easier for phagocytes to recognize? Explain how deposited complement proteins opsonize a pathogen and improve recognition by a phagocyte's complement receptors.

Type `COMPLEMENT_OPSONIZATION_PHAGOCYTE_RECOGNITION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2743436748f9.js`; view `visualization-c62761df994d.js` → `ComplementOpsonizationPhagocyteRecognitionVisualization`.

#### Complementary base pairing

In DNA, adenine pairs specifically with thymine, and guanine pairs specifically with cytosine.

Type `COMPLEMENTARY_BASE_PAIRING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-184ee5d16a84.js`; view `visualization-b4415fc9d8b2.js` → `Visualization`.

#### Complementary cell-surface recognition produces physical adhesion

Two animal cells approach until a branching surface carbohydrate tag recognizes a complementary binding protein, leaving their membranes physically attached through matching external molecules.

Type `CELL_SURFACE_RECOGNITION_ADHESION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4a95909092dd.js`; view `visualization-ae380175e45e.js` → `Visualization`.

#### Complete phosphorus reservoirs and return pathways

How do biological recycling and geological return connect one complete phosphorus cycle? Compare connected rock, soil, producer, consumer, decomposer, water, and sediment reservoirs with rapid biological and slower geological phosphate return.

Type `BIOGEOCHEMICAL_PHOSPHORUS_RESERVOIRS_AND_RETURN_PATHWAYS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a557c884f6f0.js`; view `visualization-e73c5569c1b0.js` → `Visualization`.

#### Complete versus incomplete metamorphosis

Complete metamorphosis has egg, larva, pupa, and adult butterfly; incomplete metamorphosis has egg, nymph, and adult grasshopper with no pupa.

Type `ORGANISM_COMPLETE_VERSUS_INCOMPLETE_METAMORPHOSIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-43e787595df8.js`; view `visualization-53e32e2e55ea.js` → `OrganismCompleteVersusIncompleteMetamorphosisVisualization`.

#### Complete water reservoirs and branching return pathways

How do atmospheric, plant, surface, and groundwater pathways form one branching water cycle? Compare evaporation, plant transpiration, precipitation, surface runoff, infiltration, and connected groundwater discharge in one complete water-cycle landscape.

Type `BIOGEOCHEMICAL_WATER_RESERVOIRS_AND_PATHWAYS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1dcba4f5b8e9.js`; view `visualization-d1cab1407b43.js` → `Visualization`.

#### Compound microscope anatomy

Type `MICROSCOPY_COMPOUND_MICROSCOPE_ANATOMY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1c20da86be71.js`; view `visualization-12f56f24a3bd.js` → `Visualization`.

#### Concentration gradient and dynamic equilibrium

Type `CONCENTRATION_GRADIENT_EQUILIBRIUM` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d224d9727c3f.js`; view `visualization-2f6a5916ce7e.js` → `Visualization`.

#### Connective tissue cells, fibers, and matrix

Type `ANIMAL_CONNECTIVE_TISSUE_CELLS_FIBERS_MATRIX` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-fb4a17bf09e8.js`; view `visualization-b4ce4be84d4b.js` → `AnimalConnectiveTissueCellsFibersMatrixVisualization`.

#### Connective tissue matrix comparison

Type `CONNECTIVE_TISSUE_LOOSE_DENSE_ADIPOSE_BLOOD_MATRIX` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5cb90db1e742.js`; view `visualization-bb24c1024887.js` → `ConnectiveTissueLooseDenseAdiposeBloodMatrixVisualization`.

#### Conservation population size, inherited diversity, and habitat connectivity

Type `BIODIVERSITY_CONSERVATION_POPULATION_RISK` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-87446c096512.js`; view `visualization-1d35f5f982a3.js` → `Visualization`.

#### Contained apoptotic bodies compared with accidental necrotic rupture

Type `APOPTOSIS_VERSUS_NECROSIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b4b476228285.js`; view `visualization-73e7c58e6d77.js` → `Visualization`.

#### Continuous leading-strand synthesis

Type `DNA_REPLICATION_LEADING_STRAND_SYNTHESIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4482ddc667d8.js`; view `visualization-814ee3de1c8f.js` → `DnaReplicationLeadingStrandSynthesisVisualization`.

#### Conventional pedigree symbols, connected generations, and carrier states

Type `MENDELIAN_PEDIGREE_SYMBOLS_AND_GENERATIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2a06bceb3c0b.js`; view `visualization-2a0e2a4a1b31.js` → `Visualization`.

#### Convergent aquatic vertebrate body shapes

Type `VERTEBRATE_CONVERGENT_AQUATIC_BODY_SHAPES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c275a732f227.js`; view `visualization-515a2e628758.js` → `Visualization`.

#### Corneocytes and lipids limit epidermal water loss

Type `EPIDERMAL_CORNEOCYTES_LIPID_WATER_BARRIER` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4a91b425b9ac.js`; view `visualization-612ce855f4b2.js` → `EpidermalCorneocytesLipidWaterBarrierVisualization`.

#### Cortical versus juxtamedullary nephron

Type `CORTICAL_VERSUS_JUXTAMEDULLARY_NEPHRON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c128a7643419.js`; view `visualization-587c79429186.js` → `CorticalVersusJuxtamedullaryNephronVisualization`.

#### CRISPR DNA repair outcomes

One CRISPR-generated double-strand DNA break branches into an NHEJ product containing a small indel and an HDR product containing a clearly identifiable sequence copied from a homologous donor template.

Type `CRISPR_DNA_REPAIR_OUTCOMES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1cf5b0f2b9a6.js`; view `visualization-5fdd3d927510.js` → `Visualization`.

#### CRISPR guide-directed DNA cleavage

A recognizable Cas9 protein and its guide RNA move together to an intact PAM-adjacent DNA target; Cas9 cuts both strands and remains visible beside the held double-strand break.

Type `CRISPR_GUIDE_DIRECTED_DNA_CLEAVAGE` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-90d0cb4ffb61.js`; view `visualization-dfafa6529805.js` → `Visualization`.

#### CRISPR-Cas9 target recognition

A recognizable folded Cas9 protein holds a guide RNA base-paired to one target DNA strand, with an intact adjacent PAM and a distinct cleavage marker upstream of that PAM.

Type `CRISPR_CAS9_TARGET_RECOGNITION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-4f238c17a2a5.js`; view `visualization-a191a98bc8b8.js` → `Visualization`.

#### Cytokinin divides an attached lateral bud into a leafy side shoot

Type `CYTOKININ_CELL_DIVISION_AND_BUD_GROWTH` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-abce2ea9e6f8.js`; view `visualization-292fd0f80bc5.js` → `Visualization`.

#### Cytoskeletal filament comparison

Distinguish actin filaments, intermediate filaments, and microtubules by their approximate diameters, construction, and characteristic cellular roles.

Type `CYTOSKELETAL_FILAMENT_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-51b65abd2af6.js`; view `visualization-5da865a2194b.js` → `Visualization`.

#### Cytotoxic T-cell infected-cell killing

How does a cytotoxic T cell remove a virus-infected host cell? Follow an ordinary infected host cell through specific peptide-MHC I recognition, CD8 contact, targeted apoptosis, and disappearance of both the target and its virus while the CD8 T cell survives.

Type `CYTOTOXIC_T_CELL_INFECTED_CELL_KILLING` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-5bf56dfcdd91.js`; view `visualization-2fef9f7a895a.js` → `CytotoxicTCellInfectedCellKillingVisualization`.

#### Damaged cell undergoes contained apoptosis while its healthy neighbor survives

Type `PROGRAMMED_CELL_DEATH_APOPTOSIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5d3c82dc48a7.js`; view `visualization-81d2e6a52992.js` → `Visualization`.

#### Damaged DNA arrests G1 until repair permits S-phase entry

Type `G1_DNA_DAMAGE_CHECKPOINT_ARREST` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a2eb70ab697d.js`; view `visualization-e1f73475919f.js` → `Visualization`.

#### Daylight entrains an approximately daily organismal activity rhythm

Type `CIRCADIAN_RHYTHM_LIGHT_ENTRAINMENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8361d3883c3e.js`; view `visualization-a41a560000d7.js` → `CircadianRhythmLightEntrainmentVisualization`.

#### Decomposer nutrient recycling

Type `DECOMPOSER_NUTRIENT_RECYCLING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6bc6cf95ae61.js`; view `visualization-a6cd7f53edc9.js` → `Visualization`.

#### Deep time and the Precambrian–Phanerozoic scale

Type `GEOLOGIC_DEEP_TIME_PRECAMBRIAN_PHANEROZOIC_SCALE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a3f39ff38550.js`; view `visualization-f51512303ec9.js` → `GeologicDeepTimePrecambrianPhanerozoicScaleVisualization`.

#### Dendritic-cell antigen presentation

How does a dendritic cell activate a helper T cell? Explain how an antigen-presenting dendritic cell links innate pathogen capture to adaptive helper-T-cell activation through a specific peptide-MHC II complex.

Type `DENDRITIC_CELL_ANTIGEN_PRESENTATION_HELPER_T_CELL` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e74633664c21.js`; view `visualization-fc33453d47d7.js` → `DendriticCellAntigenPresentationHelperTCellVisualization`.

#### Density-dependent population limiting factors

Type `POPULATION_ECOLOGY_DENSITY_DEPENDENT_LIMITING_FACTORS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-287064aeb533.js`; view `visualization-579168b1e0ce.js` → `Visualization`.

#### Desmosomal cadherins and intermediate filaments resist tensile stress

A desmosome links two animal cells through cadherins and intermediate filaments; outward tension pulls both cells while their mechanical attachment remains intact.

Type `DESMOSOME_CELL_ANCHORING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5cc25cdcb23a.js`; view `visualization-b3dd334c4a63.js` → `Visualization`.

#### Diaphragm-driven inhalation and quiet exhalation

Animated quiet breathing: the diaphragm descends as lung volume rises and pressure falls, drawing air inward; it then rises as lung volume falls and pressure rises, driving air outward without completely emptying the lungs.

Type `ANIMAL_DIAPHRAGM_VENTILATION_MECHANICS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-424664833bf6.js`; view `visualization-2bd4c57c4c93.js` → `AnimalDiaphragmVentilationMechanicsVisualization`.

#### Diploblastic versus triploblastic organization

Type `ANIMAL_DIPLOBLASTIC_VERSUS_TRIPLOBLASTIC_ORGANIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-979021136373.js`; view `visualization-ecffb429eee0.js` → `AnimalDiploblasticVersusTriploblasticOrganizationVisualization`.

#### Diploid population allele-frequency bookkeeping

Type `POPULATION_GENETICS_ALLELE_FREQUENCY_BOOKKEEPING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f898c4eb601c.js`; view `visualization-876af32740f8.js` → `Visualization`.

#### Direct animal-cell communication through aligned gap junctions

One small molecule moves continuously from one animal-cell cytoplasm through paired aligned gap-junction channels into the neighboring animal-cell cytoplasm.

Type `GAP_JUNCTION_CELL_COMMUNICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c64e52121975.js`; view `visualization-7c36c072a4f2.js` → `Visualization`.

#### Direct insect tracheal oxygen delivery

Animated insect respiration: one oxygen marker enters a spiracle, follows branching air-filled tracheae and a fine tracheole, and reaches a body cell directly without entering blood or hemolymph.

Type `ANIMAL_INSECT_TRACHEAL_GAS_DELIVERY` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-8bfdf3eae073.js`; view `visualization-f25235cbd8d0.js` → `AnimalInsectTrachealGasDeliveryVisualization`.

#### Direct membrane-stretch osmotic negative feedback

Type `OSMOTIC_NEGATIVE_FEEDBACK_RESPONSE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6c26ab36c0d3.js`; view `visualization-df1eec6b6f59.js` → `Visualization`.

#### Direct olfactory cortical pathway

Type `SENSORY_OLFACTORY_DIRECT_CORTICAL_PATHWAY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f189b0c0b4a3.js`; view `visualization-158dbfcc822e.js` → `Visualization`.

#### Direct plant-cell communication through a plasmodesma

One small molecule moves continuously through a membrane-lined plasmodesma and around its central desmotubule from one plant-cell cytoplasm into the neighboring plant-cell cytoplasm.

Type `PLASMODESMATA_CELL_COMMUNICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ca59a08b125b.js`; view `visualization-35d9c773ce74.js` → `Visualization`.

#### Direct versus indirect development

Direct versus indirect development: In direct development a young animal resembles a smaller version of the adult body plan; in indirect development an anatomically distinct larva transforms through metamorphosis before reaching its adult form.

Type `ANIMAL_DIRECT_VERSUS_INDIRECT_DEVELOPMENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f72842582d7b.js`; view `visualization-490c10af87a2.js` → `AnimalDirectVersusIndirectDevelopmentVisualization`.

#### Direct-contact, local, and long-distance cell communication

Three cell-communication routes compare touching cells, a nearby local target, and a distant target reached through the bloodstream.

Type `CELL_COMMUNICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e353c31b65d6.js`; view `visualization-b397c4757e85.js` → `CellCommunicationVisualization`.

#### Directed isopod taxis toward a favorable moisture stimulus

Type `DIRECTED_TAXIS_STIMULUS_GRADIENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-555488305e41.js`; view `visualization-7681f7e346f6.js` → `DirectedTaxisStimulusGradientVisualization`.

#### Discontinuous Okazaki-fragment synthesis

Type `DNA_REPLICATION_LAGGING_OKAZAKI_FRAGMENTS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9e7df1ab4453.js`; view `visualization-f6fd4a8bdcfa.js` → `DnaReplicationLaggingOkazakiFragmentsVisualization`.

#### Diversity of life overview

Type `DIVERSITY_OF_LIFE_OVERVIEW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d128dc8aaacf.js`; view `visualization-92cfdf6c40c1.js` → `Visualization`.

#### DNA and RNA nucleotide comparison

DNA contains deoxyribose and thymine and usually has two strands, while RNA contains ribose and uracil and usually has one strand.

Type `DNA_RNA_NUCLEOTIDE_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d8a307b03004.js`; view `visualization-32f86bafe64b.js` → `Visualization`.

#### DNA gene structure produces an aligned complementary RNA message

Type `DNA_AND_RNA_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4d8787b10dc9.js`; view `visualization-deff6a0a47e0.js` → `DnaAndRnaStructureVisualization`.

#### DNA polymerase proofreading

Type `DNA_REPLICATION_POLYMERASE_PROOFREADING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-805e59ce7ab3.js`; view `visualization-59b23870859a.js` → `DnaReplicationPolymeraseProofreadingVisualization`.

#### DNA replication overview

Type `DNA_REPLICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-36cf057d68b8.js`; view `visualization-52fbd096922c.js` → `DnaReplicationVisualization`.

#### Dominant Golgi stack receives at cis and ships at trans

Type `GOLGI_APPARATUS_STRUCTURE_AND_SORTING` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-fac0216447fb.js`; view `visualization-a56f3676505f.js` → `Visualization`.

#### Doubling model-cell width lowers its surface-area-to-volume ratio

A one-unit model cell has surface area 6, volume 1, and a 6-to-1 ratio. A two-unit model cell has surface area 24, volume 8, and a 3-to-1 ratio. Increasing cell size lowers the surface-area-to-volume ratio and leaves less membrane exchange area per unit volume.

Type `CELL_THEORY_SURFACE_AREA_TO_VOLUME_RATIO` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d860ae5a868e.js`; view `visualization-c81049085e8a.js` → `Visualization`.

#### Early-Earth prebiotic environments

Type `EARLY_EARTH_PREBIOTIC_ENVIRONMENTS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-81058b95054b.js`; view `visualization-dbefea6c0798.js` → `Visualization`.

#### Echinoderm larval-to-adult symmetry

Type `ANIMAL_ECHINODERM_LARVAL_TO_ADULT_SYMMETRY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b58fa045c9d8.js`; view `visualization-edb24cd4af0b.js` → `AnimalEchinodermLarvalToAdultSymmetryVisualization`.

#### Echinoderm water vascular tube feet

Type `ANIMAL_ECHINODERM_WATER_VASCULAR_TUBE_FEET` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e4912b15d968.js`; view `visualization-a30948b63943.js` → `AnimalEchinodermWaterVascularTubeFeetVisualization`.

#### Ecological population density and habitat area

Type `POPULATION_ECOLOGY_DENSITY_AND_AREA` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-abaf090ceac1.js`; view `visualization-63674b33c236.js` → `Visualization`.

#### ecological-disturbance-secondary-succession

Type `ECOLOGICAL_DISTURBANCE_SECONDARY_SUCCESSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7c909b1a818f.js`; view `visualization-b65385c693d5.js` → `EcologicalDisturbanceSecondarySuccessionVisualization`.

#### Ecosystem energy flow versus matter cycling

Type `ECOSYSTEM_ENERGY_FLOW_VERSUS_MATTER_CYCLING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e29ca0dd9ed3.js`; view `visualization-7dca4e24e509.js` → `Visualization`.

#### Ecosystem food web energy pathways

Type `ECOSYSTEM_FOOD_WEB_ENERGY_PATHWAYS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-99ac228d759b.js`; view `visualization-7a26be3353ee.js` → `Visualization`.

#### Ecosystem primary productivity GPP and NPP

Type `ECOSYSTEM_PRIMARY_PRODUCTIVITY_GPP_NPP` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b1aa2146fe45.js`; view `visualization-4bb12570dd26.js` → `Visualization`.

#### Ecosystem trophic energy pyramid

Type `ECOSYSTEM_TROPHIC_ENERGY_PYRAMID` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9660c42abf3b.js`; view `visualization-9b30e4160487.js` → `Visualization`.

#### Ecosystem trophic level hierarchy

Type `ECOSYSTEM_TROPHIC_LEVEL_HIERARCHY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-28ad22688ec0.js`; view `visualization-2a2ff192b2e5.js` → `Visualization`.

#### ecosystem-disturbance-food-web-cascade

Type `ECOSYSTEM_DISTURBANCE_FOOD_WEB_CASCADE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b07ef11f08ac.js`; view `visualization-c5cdc69b3655.js` → `EcosystemDisturbanceFoodWebCascadeVisualization`.

#### Effective buffer range around pKa

Type `BIOLOGICAL_BUFFER_EFFECTIVE_PH_RANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cdcc03897190.js`; view `visualization-7f19c56d1b12.js` → `Visualization`.

#### Electron transport chain proton pumping

Type `ELECTRON_TRANSPORT_CHAIN_PROTON_PUMPING` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-2a071fe8df9a.js`; view `visualization-f3e8fef53f3f.js` → `ElectronTransportChainProtonPumpingVisualization`.

#### Embryo gibberellin activates aleurone enzymes and germination

Type `GIBBERELLIN_SEED_GERMINATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-bc1e84b8d572.js`; view `visualization-973eec527d1b.js` → `Visualization`.

#### Embryonic cleavage and blastula formation

Embryonic cleavage and blastula formation: Early cleavage is a rapid series of mitotic divisions that increases cell number without enlarging the whole embryo; subsequent organization produces a blastula containing a fluid-filled blastocoel.

Type `ANIMAL_EMBRYONIC_CLEAVAGE_BLASTULA` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-13d19f969c7a.js`; view `visualization-5c7c6700d081.js` → `AnimalEmbryonicCleavageBlastulaVisualization`.

#### Embryonic development stage sequence

Embryonic development stage sequence: After fertilization, the one-cell zygote undergoes cleavage to form a multicellular blastula. Gastrulation reorganizes cells into ectoderm, mesoderm, and endoderm, and later neurulation folds specialized ectoderm into a neural tube; these are ordered states of one developing embryo, not separate offspring.

Type `ANIMAL_EMBRYONIC_DEVELOPMENT_STAGE_SEQUENCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c840ad7d526d.js`; view `visualization-cd8609df90d8.js` → `AnimalEmbryonicDevelopmentStageSequenceVisualization`.

#### Endocytosis and vesicle uptake

Type `ENDOCYTOSIS_VESICLE_UPTAKE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-74ea7c8761d9.js`; view `visualization-ef29584933e7.js` → `Visualization`.

#### Endosymbiotic origin of chloroplasts

Type `LIFE_CHLOROPLAST_ENDOSYMBIOTIC_ORIGIN` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-94f29a3fe0fe.js`; view `visualization-5b35574e0066.js` → `Visualization`.

#### Endosymbiotic origin of mitochondria

Type `LIFE_ENDOSYMBIOTIC_ORIGIN_OF_MITOCHONDRIA` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-245e5281b392.js`; view `visualization-46ab212a5f51.js` → `Visualization`.

#### Endothermy versus ectothermy

Type `VERTEBRATE_ENDOTHERMY_VERSUS_ECTOTHERMY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cca550000786.js`; view `visualization-ad4a4ed228f8.js` → `Visualization`.

#### Environmental change shifts carrying capacity

Type `POPULATION_ECOLOGY_CARRYING_CAPACITY_ENVIRONMENTAL_CHANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-bca3f4b3ba3b.js`; view `visualization-7199b067ce4b.js` → `Visualization`.

#### Environmental selection pressure

Type `ENVIRONMENTAL_SELECTION_PRESSURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-372842ff9913.js`; view `visualization-7460b1e67417.js` → `EnvironmentalSelectionPressureVisualization`.

#### Enzyme activity rises to a temperature optimum before denaturation

Type `ENZYME_TEMPERATURE_ACTIVITY_CURVE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-48ac00d257e0.js`; view `visualization-2fe777fc6677.js` → `Visualization`.

#### Enzyme structure, active site, substrate, and products

Type `ENZYME_STRUCTURE_AND_FUNCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-67b650603009.js`; view `visualization-ba37c06cc5d4.js` → `Visualization`.

#### Enzymes lower activation energy without changing reaction free energy

Type `ENZYME_ACTIVATION_ENERGY_PROFILE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-42aa1ee5e675.js`; view `visualization-b47b0ad0231b.js` → `Visualization`.

#### Epidermal renewal and shedding

Type `EPIDERMAL_KERATINOCYTE_RENEWAL_AND_SHEDDING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5ff6311826ce.js`; view `visualization-abd3d43098ce.js` → `EpidermalKeratinocyteRenewalAndSheddingVisualization`.

#### Epithelial apical-basal polarity

Type `EPITHELIAL_APICAL_BASAL_POLARITY_BASEMENT_MEMBRANE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f0e22c55295b.js`; view `visualization-cd772a21368b.js` → `EpithelialApicalBasalPolarityBasementMembraneVisualization`.

#### Epithelial cell migration closes a wound

Type `WOUND_REEPITHELIALIZATION_CELL_MIGRATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-bda3eb68be5b.js`; view `visualization-6c35bf77116c.js` → `WoundReepithelializationCellMigrationVisualization`.

#### Equal-time nutrient diffusion into small and large cells

Type `CELL_SIZE_DIFFUSION_PENETRATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c9658a4fa072.js`; view `visualization-9154998c1e5e.js` → `CellSizeDiffusionPenetrationVisualization`.

#### Equal-volume compact and flattened cell surface comparison

Type `CELL_SIZE_SHAPE_EXCHANGE_SURFACE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-57068f32547f.js`; view `visualization-c01501d8f6f6.js` → `CellSizeShapeExchangeSurfaceVisualization`.

#### Ethylene fruit ripening feedback

Type `ETHYLENE_FRUIT_RIPENING_FEEDBACK` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-dd55cfa4fea1.js`; view `visualization-fd28b1948b8b.js` → `Visualization`.

#### Ethylene leaf abscission

Type `ETHYLENE_LEAF_ABSCISSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-790391f33cd1.js`; view `visualization-320aba518948.js` → `Visualization`.

#### Eukaryotic flagellum propulsion

Connect a traveling bend along one eukaryotic flagellum with propulsion of its attached cell in the opposite direction.

Type `EUKARYOTIC_FLAGELLUM_PROPULSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-018087453a82.js`; view `visualization-715502b9f7b5.js` → `Visualization`.

#### Eusocial colony division of labor

Type `ANIMAL_EUSOCIAL_COLONY_DIVISION_OF_LABOR` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d6e90727b239.js`; view `visualization-d6b84a8ea515.js` → `Visualization`.

#### eutrophication-decomposition-oxygen-depletion

Type `EUTROPHICATION_DECOMPOSITION_OXYGEN_DEPLETION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c97aefcc55e3.js`; view `visualization-1e64565eed23.js` → `EutrophicationDecompositionOxygenDepletionVisualization`.

#### eutrophication-nutrient-runoff-algal-bloom

Type `EUTROPHICATION_NUTRIENT_RUNOFF_ALGAL_BLOOM` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-371d3382c4cc.js`; view `visualization-5ebba275d34e.js` → `EutrophicationNutrientRunoffAlgalBloomVisualization`.

#### Evidence for evolution

Type `EVIDENCE_FOR_EVOLUTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e455190d0e52.js`; view `visualization-bcf08df8fc3a.js` → `EvidenceForEvolutionVisualization`.

#### Evolutionary time, fossils, and major transitions

Type `EVOLUTIONARY_TIME_FOSSILS_AND_MAJOR_TRANSITIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c64579b37e0d.js`; view `visualization-2b2cb67b17c0.js` → `EvolutionaryTimeFossilsAndMajorTransitionsVisualization`.

#### Excitation-contraction coupling

Type `MUSCULOSKELETAL_EXCITATION_CONTRACTION_COUPLING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6b48b6e720d9.js`; view `visualization-885b0ed14d8b.js` → `MusculoskeletalExcitationContractionCouplingVisualization`.

#### Excitatory versus inhibitory synapses

An excitatory synapse allows sodium entry and produces a positive graded EPSP toward threshold. An inhibitory synapse allows chloride entry and produces an inhibitory IPSP that opposes firing.

Type `EXCITATORY_VERSUS_INHIBITORY_SYNAPSES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-74fcb7e43d98.js`; view `visualization-d0ed58d9b5f9.js` → `ExcitatoryVersusInhibitorySynapsesVisualization`.

#### Exocytosis and vesicle secretion

Type `EXOCYTOSIS_VESICLE_SECRETION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-883dc4ee9e3f.js`; view `visualization-35f49cc0329d.js` → `Visualization`.

#### Exponential population growth with abundant resources

Type `POPULATION_ECOLOGY_EXPONENTIAL_GROWTH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ffd542c2ce07.js`; view `visualization-2e48a5aa7d0a.js` → `Visualization`.

#### Exponential versus logistic population-growth models

Type `POPULATION_ECOLOGY_EXPONENTIAL_VERSUS_LOGISTIC_GROWTH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9a8bbb060c43.js`; view `visualization-25815556b1b7.js` → `Visualization`.

#### Exposed gymnosperm seeds versus enclosed angiosperm seeds

Compare gymnosperm seeds exposed on cone scales with angiosperm seeds enclosed inside an ovary-derived fruit while recognizing that both groups produce seeds.

Type `PLANT_GYMNOSPERM_VERSUS_ANGIOSPERM_SEED_ENCLOSURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-594d18be1033.js`; view `visualization-aadaeb9b71b3.js` → `PlantGymnospermVersusAngiospermSeedEnclosureVisualization`.

#### Facilitated diffusion through a carrier

Type `FACILITATED_DIFFUSION_CARRIER` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-51ad246c8d12.js`; view `visualization-77dd66f4d161.js` → `Visualization`.

#### Facilitated diffusion through a channel

Type `FACILITATED_DIFFUSION_CHANNEL` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5a9db9c8f033.js`; view `visualization-d2398d98f25a.js` → `Visualization`.

#### Female reproductive anatomy

Female reproductive anatomy: The ovaries release oocytes, uterine tubes receive them and are the usual site of fertilization, the uterus contains the lining where implantation occurs, and the cervix forms the lower uterine outlet.

Type `ANIMAL_FEMALE_REPRODUCTIVE_ANATOMY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3e918a857c6f.js`; view `visualization-2482d4ad53db.js` → `AnimalFemaleReproductiveAnatomyVisualization`.

#### Fermentation NAD regeneration

Type `FERMENTATION_NAD_REGENERATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-bf0deb61b361.js`; view `visualization-1ad1d52e97bb.js` → `FermentationNadRegenerationVisualization`.

#### Fern sori, sporangia, and spores

Locate sori on a fern sporophyte frond and identify the sporangia within each sorus as structures that produce haploid spores by meiosis.

Type `FERN_SORI_SPORANGIA_AND_SPORE_PRODUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-92b3231a4a1e.js`; view `visualization-5d1b2566c3ea.js` → `FernSoriSporangiaAndSporeProductionVisualization`.

#### Fern sporophyte and gametophyte life cycle

Trace a dominant diploid fern sporophyte through meiosis, a haploid spore, an independent heart-shaped gametophyte, water-dependent gamete fusion, and a diploid zygote that becomes a new sporophyte.

Type `FERN_SPOROPHYTE_GAMETOPHYTE_LIFE_CYCLE` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-4357ee6b3888.js`; view `visualization-a15ee8107aa4.js` → `FernSporophyteGametophyteLifeCycleVisualization`.

#### Fertilization and the block to polyspermy

Fertilization and the block to polyspermy: When one sperm fuses with a mammalian oocyte, egg activation triggers cortical-granule release and biochemical modification of the surrounding zona pellucida. The modified egg coat reduces binding or penetration by additional sperm, preventing polyspermy and preserving one maternal and one paternal genetic contribution.

Type `ANIMAL_FERTILIZATION_CORTICAL_BLOCK_POLYSPERMY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1f935d4bac27.js`; view `visualization-629852e5869f.js` → `AnimalFertilizationCorticalBlockPolyspermyVisualization`.

#### Fish operculum and gill ventilation

Type `VERTEBRATE_FISH_OPERCULUM_GILL_VENTILATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a73142cd456e.js`; view `visualization-ae9a91904e56.js` → `Visualization`.

#### Fish-gill countercurrent oxygen exchange

Animated fish-gill countercurrent exchange: water and capillary blood flow in opposite directions on separate sides of a lamella, oxygen crosses repeatedly from water into blood, and the same blood becomes more oxygen-rich.

Type `ANIMAL_GILL_COUNTERCURRENT_OXYGEN_EXCHANGE` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-2936b53c6479.js`; view `visualization-eaddd43ec6b7.js` → `AnimalGillCountercurrentOxygenExchangeVisualization`.

#### Five major mass extinctions in geologic time

Type `FIVE_MAJOR_MASS_EXTINCTIONS_IN_GEOLOGIC_TIME` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5f246c089eb7.js`; view `visualization-aa1a7f7a8be9.js` → `FiveMajorMassExtinctionsInGeologicTimeVisualization`.

#### Five-prime-to-three-prime DNA synthesis

Type `DNA_REPLICATION_FIVE_PRIME_TO_THREE_PRIME_SYNTHESIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-68d8f07ee799.js`; view `visualization-a5b5e846abd7.js` → `DnaReplicationFivePrimeToThreePrimeSynthesisVisualization`.

#### Flatworm branched gastrovascular distribution

Type `ANIMAL_FLATWORM_BRANCHED_GASTROVASCULAR_DISTRIBUTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cf5096137673.js`; view `visualization-49c702a40f75.js` → `AnimalFlatwormBranchedGastrovascularDistributionVisualization`.

#### Florigen leaf to shoot apex

Type `FLORIGEN_LEAF_TO_SHOOT_APEX` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cfb2e291bbf8.js`; view `visualization-c20bd5226e3a.js` → `Visualization`.

#### Flower reproductive anatomy

Flower anatomy showing pollen-producing anthers, receptive stigma, connecting style, ovary, and ovules inside the ovary

Type `PLANT_FLOWER_REPRODUCTIVE_ANATOMY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-70e9046b2d2f.js`; view `visualization-b7a50fa42fb1.js` → `Visualization`.

#### Flower-to-fruit and ovule-to-seed development

A flower's ovary developing into a fruit while the same enclosed fertilized ovules become seeds inside it

Type `PLANT_FLOWER_TO_FRUIT_SEED_DEVELOPMENT` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-dcf56e501255.js`; view `visualization-5c7b9a506e43.js` → `Visualization`.

#### Flowering plant structure, transport, and reproduction

Flowering plant showing roots below soil, a stem, leaves, a flower, upward xylem water transport, and source-to-sink phloem sugar transport

Type `PLANT_STRUCTURE_TRANSPORT_AND_REPRODUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-73c45877b1bc.js`; view `visualization-c3a6429921ef.js` → `Visualization`.

#### Flowering-plant life cycle

Flowering-plant life cycle: a seed grows into a seedling and then a flowering adult, which produces new seeds for another generation.

Type `ORGANISM_FLOWERING_PLANT_LIFE_CYCLE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-324c515c6607.js`; view `visualization-b67f2bbcba46.js` → `OrganismFloweringPlantLifeCycleVisualization`.

#### Flowering-plant life cycle

Closed flowering-plant life cycle showing a living seed, rooted seedling, mature flowering plant, bee-assisted pollination, new seeds in fruit, and dispersal back to another generation

Type `PLANT_FLOWERING_LIFE_CYCLE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-416a5b513130.js`; view `visualization-abc6bf0dcfb6.js` → `Visualization`.

#### Focus and microscope depth of field

Type `MICROSCOPY_FOCUS_DEPTH_OF_FIELD` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d4306cc9f2f8.js`; view `visualization-c5dcfcace2df.js` → `Visualization`.

#### Folded mitochondrial inner membranes localize many ATP-forming complexes

Type `ORGANELLE_MEMBRANE_SURFACE_AREA` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-453b4ad324ee.js`; view `visualization-fc162f0c82b4.js` → `Visualization`.

#### Food separates into nutrients that become growing body tissue

Food enters the intestine, separates into smaller nutrients, and the same food-derived matter becomes growing body tissue.

Type `FOOD_DIGESTION_TO_BUILDING_MATERIALS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cb82ca8447e5.js`; view `visualization-26b96b34ed4f.js` → `Visualization`.

#### Fossil strata and relative age

Type `EVOLUTION_FOSSIL_STRATA_RELATIVE_AGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9f05b607c84d.js`; view `visualization-1386191979ec.js` → `EvolutionFossilStrataRelativeAgeVisualization`.

#### Fossil-age bracketing with volcanic ash

Type `FOSSIL_AGE_BRACKETING_WITH_VOLCANIC_ASH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-70f88dbb98e8.js`; view `visualization-911de87235b5.js` → `FossilAgeBracketingWithVolcanicAshVisualization`.

#### Fossil-record preservation and sampling bias

Type `FOSSIL_RECORD_PRESERVATION_AND_SAMPLING_BIAS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7956eb431ee9.js`; view `visualization-7f5f5c3b71f3.js` → `FossilRecordPreservationAndSamplingBiasVisualization`.

#### Fossilization through burial, mineralization, and exposure

Type `FOSSILIZATION_BURIAL_MINERALIZATION_EXPOSURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-16af45aaa5a5.js`; view `visualization-e5c6b6e1e439.js` → `FossilizationBurialMineralizationExposureVisualization`.

#### Founder effect and a newly established population

Type `POPULATION_GENETICS_FOUNDER_EFFECT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b44205a60514.js`; view `visualization-bf7bedf8afed.js` → `Visualization`.

#### Four abnormal meiosis-I gametes contrast with two abnormal and two normal meiosis-II gametes

Type `MEIOTIC_NONDISJUNCTION_OUTCOME_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-730967eec15c.js`; view `visualization-e508e5938456.js` → `Visualization`.

#### Four animal tissue types

Type `ANIMAL_FOUR_TISSUE_TYPES_STRUCTURE_AND_FUNCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4bad07577538.js`; view `visualization-a40bc9a4622e.js` → `AnimalFourTissueTypesStructureAndFunctionVisualization`.

#### Four cells crossing a calibrated 320-micrometer microscope field

A compound light microscope reveals four similar cells spanning a 320-micrometer field diameter, so each cell is about 80 micrometers wide.

Type `CELL_THEORY_MICROSCOPE_FIELD_OF_VIEW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5c33e30ce081.js`; view `visualization-d759b408aa32.js` → `Visualization`.

#### Four Pp by Pp transmission paths become 1:2:1 genotypes and 3:1 phenotypes

Type `MENDELIAN_MONOHYBRID_PHENOTYPE_RATIOS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-be85edf3a8cf.js`; view `visualization-dba67f92e3d0.js` → `Visualization`.

#### Four stages of skin wound repair

Type `SKIN_WOUND_HEMOSTASIS_SCAB_AND_TISSUE_REPAIR` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9b2ef94680d5.js`; view `visualization-cb62144e8966.js` → `SkinWoundHemostasisScabAndTissueRepairVisualization`.

#### Fracture healing and callus formation

Type `MUSCULOSKELETAL_FRACTURE_HEALING_STAGES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c637cb0eec12.js`; view `visualization-0b2300bdfb34.js` → `MusculoskeletalFractureHealingStagesVisualization`.

#### Frameshift versus in-frame insertion

Type `MUTATION_FRAMESHIFT_VERSUS_IN_FRAME` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4bb2814e92f7.js`; view `visualization-7270f1e500e7.js` → `Visualization`.

#### Free bacterial cells attach and develop a protective biofilm matrix

Type `BACTERIAL_BIOFILM_FORMATION_AND_MATRIX` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-456585d3a920.js`; view `visualization-7be7ab3cef95.js` → `BacterialBiofilmFormationAndMatrixVisualization`.

#### Freshwater fish osmoregulation

Type `FRESHWATER_FISH_OSMOREGULATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-89e0028a0ec7.js`; view `visualization-201b82f69ab6.js` → `FreshwaterFishOsmoregulationVisualization`.

#### Freshwater protist contractile-vacuole osmoregulation

Type `CONTRACTILE_VACUOLE_OSMOREGULATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-49d4dc985996.js`; view `visualization-beede0e28943.js` → `Visualization`.

#### Freshwater versus marine fish osmoregulation

Type `FRESHWATER_VERSUS_MARINE_FISH_OSMOREGULATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b63773132957.js`; view `visualization-f6ddffe10e17.js` → `FreshwaterVersusMarineFishOsmoregulationVisualization`.

#### Frog metamorphosis

Frog metamorphosis: an egg becomes a tadpole, then a legged froglet with a shortening tail, then an adult frog that produces new eggs.

Type `ORGANISM_FROG_METAMORPHOSIS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-f323766213be.js`; view `visualization-4ff229c8a9ff.js` → `OrganismFrogMetamorphosisVisualization`.

#### Functional redundancy preserves a represented pollination role

Type `BIODIVERSITY_FUNCTIONAL_REDUNDANCY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cccc281bbee7.js`; view `visualization-9b435b6d84a1.js` → `Visualization`.

#### Functional-group polarity and water interactions

Type `BIOLOGICAL_FUNCTIONAL_GROUP_POLARITY_AND_WATER_INTERACTIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-728bb0a4c34b.js`; view `visualization-5d2e49ca524b.js` → `Visualization`.

#### Fungal decomposition and matter cycling

Type `LIFE_FUNGAL_DECOMPOSITION_AND_MATTER_CYCLING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b3a0c8b50778.js`; view `visualization-fff4b1d3c412.js` → `Visualization`.

#### Fungal extracellular digestion

Type `FUNGAL_EXTRACELLULAR_DIGESTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2a19f75221d6.js`; view `visualization-c0db4c2c6274.js` → `Visualization`.

#### Fungal hyphae and mycelium

Type `FUNGAL_HYPHAE_AND_MYCELIUM` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-bc847d169533.js`; view `visualization-785f1deb6e74.js` → `Visualization`.

#### Fungal septate and coenocytic hyphae

Type `FUNGAL_SEPTATE_AND_COENOCYTIC_HYPHAE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7771be7086de.js`; view `visualization-34c151ceefbe.js` → `Visualization`.

#### Fungal spore dispersal and germination

Type `FUNGAL_SPORE_DISPERSAL_AND_GERMINATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-540bf415710b.js`; view `visualization-51ece4fc98bf.js` → `Visualization`.

#### G1/S, G2/M, and spindle checkpoint prerequisites

Type `CELL_CYCLE_CHECKPOINT_DECISION_MAP` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-38c7b029795b.js`; view `visualization-4aaf95b62113.js` → `Visualization`.

#### Gametophyte versus sporophyte dominance

Compare the conspicuous haploid moss gametophyte with the dominant diploid sporophytes of ferns, conifers, and flowering plants while retaining both generations in every lineage.

Type `PLANT_GAMETOPHYTE_SPOROPHYTE_DOMINANCE_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2b6de71a891e.js`; view `visualization-479c1ce06710.js` → `PlantGametophyteSporophyteDominanceComparisonVisualization`.

#### Gastrulation and three germ layers

Gastrulation and three germ layers: During gastrulation cells of an early embryo move inward and reorganize to establish the outer ectoderm, middle mesoderm, and inner endoderm, creating the layered foundation for later tissues and organs.

Type `ANIMAL_GASTRULATION_GERM_LAYER_FORMATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cbb13a39903e.js`; view `visualization-45f69030198d.js` → `AnimalGastrulationGermLayerFormationVisualization`.

#### Gel electrophoresis apparatus

A recognizable top-down electrophoresis chamber frames an agarose gel with aligned wells at the negative end, a size-standard ladder, a sample lane, and the positive electrode beyond the migration path.

Type `GEL_ELECTROPHORESIS_APPARATUS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-19d92ba3f9ff.js`; view `visualization-ca8d099b7ca2.js` → `Visualization`.

#### Gel electrophoresis size separation

DNA fragments labeled 900, 500, and 200 base pairs start at the same negative-electrode wells; the 200-base-pair fragment travels farthest toward the positive electrode while the 900-base-pair fragment travels least.

Type `GEL_ELECTROPHORESIS_SIZE_SEPARATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-7d3d7e57affb.js`; view `visualization-39045132fffe.js` → `Visualization`.

#### Gene flow between existing populations

Type `POPULATION_GENETICS_GENE_FLOW_MIGRATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7bfc4ad9b598.js`; view `visualization-cd4ef493e666.js` → `Visualization`.

#### Gibberellin stem internode elongation

Type `GIBBERELLIN_STEM_INTERNODE_ELONGATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-56d6af94495e.js`; view `visualization-943bff30ebc0.js` → `Visualization`.

#### Glycolysis carbon and energy flow

Type `GLYCOLYSIS_CARBON_AND_ENERGY_FLOW` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-2042578c6082.js`; view `visualization-659c2065d8e0.js` → `GlycolysisCarbonAndEnergyFlowVisualization`.

#### Glycosidic bond formation and hydrolysis

Type `GLYCOSIDIC_BOND_FORMATION_HYDROLYSIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6985a3ff1284.js`; view `visualization-e3250934a921.js` → `Visualization`.

#### Gradual versus punctuated fossil change

Type `GRADUAL_VERSUS_PUNCTUATED_FOSSIL_CHANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-592424351345.js`; view `visualization-a8512607e692.js` → `GradualVersusPunctuatedFossilChangeVisualization`.

#### Gram-positive versus Gram-negative envelopes

Type `GRAM_POSITIVE_VERSUS_GRAM_NEGATIVE_ENVELOPES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-69751cc87d2a.js`; view `visualization-2eab614f3498.js` → `GramPositiveVersusGramNegativeEnvelopesVisualization`.

#### Great Oxygenation and the rise of atmospheric oxygen

Type `GREAT_OXYGENATION_AND_ATMOSPHERIC_OXYGEN_RISE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-253c0912488c.js`; view `visualization-eb8073a80e1f.js` → `GreatOxygenationAndAtmosphericOxygenRiseVisualization`.

#### Guard-cell turgor and stomatal opening

Two guard cells take up water, bow apart as their turgor rises, and reveal an open stomatal pore between the same cells

Type `PLANT_GUARD_CELL_TURGOR_STOMATAL_OPENING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4e450da83722.js`; view `visualization-d4952e92d2b7.js` → `Visualization`.

#### Gymnosperm cones, pollen, and exposed seeds

Trace an initially unfertilized ovule on a recognizable conifer cone through pollen arrival and fertilization to visible seeds exposed on the same cone scales.

Type `GYMNOSPERM_CONE_POLLINATION_AND_EXPOSED_SEEDS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-ce71b0df47d1.js`; view `visualization-4807910d2b20.js` → `GymnospermConePollinationAndExposedSeedsVisualization`.

#### habitat-fragmentation-population-isolation

Type `HABITAT_FRAGMENTATION_POPULATION_ISOLATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5a5c7e69e977.js`; view `visualization-c64ef420e560.js` → `HabitatFragmentationPopulationIsolationVisualization`.

#### Hardy–Weinberg expected genotype frequencies

Type `POPULATION_GENETICS_HARDY_WEINBERG_EQUILIBRIUM_EXPECTATIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5150123cf932.js`; view `visualization-e8247608c410.js` → `Visualization`.

#### Helper T-cell coordination

How can helper T cells coordinate B-cell and cytotoxic-T-cell responses? Explain that activated helper T cells coordinate both antibody-producing B-cell responses and cell-mediated cytotoxic T-cell responses through targeted signaling.

Type `HELPER_T_CELL_COORDINATES_ADAPTIVE_IMMUNITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-93747a3369c7.js`; view `visualization-9e22881831f8.js` → `HelperTCellCoordinatesAdaptiveImmunityVisualization`.

#### Hemoglobin loads oxygen at lungs and unloads it at tissues

Hemoglobin oxygen-transport animation: oxygen moves from lung air onto one red blood cell, that same cell remains inside the blood vessel while traveling to body tissue, and the oxygen leaves the cell for the tissue.

Type `ANIMAL_HEMOGLOBIN_OXYGEN_LOADING_UNLOADING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5e4bde0a90b5.js`; view `visualization-2a3027a2a2d7.js` → `AnimalHemoglobinOxygenLoadingUnloadingVisualization`.

#### Heritable trait variation in a population

Type `HERITABLE_TRAIT_VARIATION_POPULATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a615e14ccc37.js`; view `visualization-da48af21b21c.js` → `HeritableTraitVariationPopulationVisualization`.

#### Hinge versus ball-and-socket motion

Type `MUSCULOSKELETAL_HINGE_VERSUS_BALL_AND_SOCKET` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-762e2335d307.js`; view `visualization-41c635a1ff54.js` → `MusculoskeletalHingeVersusBallAndSocketVisualization`.

#### Histone acetylation is associated with more open chromatin, increased promoter accessibility, RNA-polymerase recruitment, and visible mRNA production.

Type `HISTONE_ACETYLATION_CHROMATIN_OPENING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-167d63e1a2f5.js`; view `visualization-39dc4986f4e1.js` → `Visualization`.

#### Homologous vertebrate forelimbs

Type `EVOLUTION_HOMOLOGOUS_VERTEBRATE_FORELIMBS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e38b20b2bf6b.js`; view `visualization-a85c22968723.js` → `EvolutionHomologousVertebrateForelimbsVisualization`.

#### HPA axis cortisol stress response

Type `HPA_AXIS_CORTISOL_STRESS_RESPONSE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2f43bdec8785.js`; view `visualization-7687744858de.js` → `Visualization`.

#### HPT axis thyroid hormone regulation

Type `HPT_AXIS_THYROID_HORMONE_REGULATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7df912491cdc.js`; view `visualization-57fcf3aa9b76.js` → `Visualization`.

#### human-land-use-biodiversity-loss

Type `HUMAN_LAND_USE_BIODIVERSITY_LOSS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3c23925a2cff.js`; view `visualization-4e27c3b23a32.js` → `HumanLandUseBiodiversityLossVisualization`.

#### Humoral versus cell-mediated immunity

How do antibody-mediated and T-cell-mediated defenses target different infections? Distinguish humoral defense against extracellular targets from cell-mediated CD8 T-cell defense against infected host cells while recognizing both as adaptive immunity.

Type `HUMORAL_VERSUS_CELL_MEDIATED_IMMUNITY` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-11a1a8a393bb.js`; view `visualization-ce9d152d049c.js` → `HumoralVersusCellMediatedImmunityVisualization`.

#### Hydrostatic skeleton, exoskeleton, and endoskeleton

Type `ANIMAL_HYDROSTATIC_EXOSKELETON_ENDOSKELETON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f77a214b3acf.js`; view `visualization-aedd58e422fd.js` → `AnimalHydrostaticExoskeletonEndoskeletonVisualization`.

#### Immersion oil retains light lost at a glass-to-air interface

Type `MICROSCOPY_OIL_IMMERSION_REFRACTIVE_INDEX` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-780edb36cbd7.js`; view `visualization-8b44448693b8.js` → `Visualization`.

#### In-frame insertion and deletion

Type `MUTATION_IN_FRAME_INDELS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-aaecd71e70d3.js`; view `visualization-f6a69741666a.js` → `Visualization`.

#### Incomplete DNA replication blocks G2 until a complete chromosome can enter mitosis

Type `G2_REPLICATION_COMPLETION_CHECKPOINT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-558a29617ab5.js`; view `visualization-718d115ae137.js` → `Visualization`.

#### Incomplete dominance heterozygote cross and one-to-two-to-one ratio

Type `INCOMPLETE_DOMINANCE_PHENOTYPE_RATIOS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-822c8d210de0.js`; view `visualization-c8609113e51c.js` → `IncompleteDominancePhenotypeRatiosVisualization`.

#### Incomplete versus complete digestive tract

Type `ANIMAL_INCOMPLETE_VERSUS_COMPLETE_DIGESTIVE_TRACT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-23c40861ef25.js`; view `visualization-eb8ac9540741.js` → `AnimalIncompleteVersusCompleteDigestiveTractVisualization`.

#### Independent chromosome-set and DNA-content accounting through S phase and both meiotic divisions

Type `MEIOTIC_CHROMOSOME_CHROMATID_ACCOUNTING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d0a4b5e77aed.js`; view `visualization-de82842df18b.js` → `Visualization`.

#### Index-fossil correlation across rock layers

Type `INDEX_FOSSIL_CORRELATION_ACROSS_ROCK_LAYERS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ea30f50b04d8.js`; view `visualization-b15839931ab0.js` → `IndexFossilCorrelationAcrossRockLayersVisualization`.

#### Induced-fit binding, catalysis, product release, and enzyme reuse

Type `ENZYME_INDUCED_FIT_CATALYTIC_CYCLE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d09e20b6ac28.js`; view `visualization-12100a282415.js` → `Visualization`.

#### Inherited diversity within one species

Type `BIODIVERSITY_GENETIC_DIVERSITY_WITHIN_SPECIES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7ead817c9a68.js`; view `visualization-57dfc41b0bf5.js` → `Visualization`.

#### Innate versus adaptive immune response timing

How do innate and adaptive responses differ across a first and repeated infection? Distinguish the rapid broad innate response from slower antigen-specific primary adaptive activation and the faster secondary adaptive response produced by matching immune memory.

Type `INNATE_VERSUS_ADAPTIVE_IMMUNE_RESPONSE_TIMING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-53728c5f3da2.js`; view `visualization-83e03da1280b.js` → `InnateVersusAdaptiveImmuneResponseTimingVisualization`.

#### Integrin mechanically attaches extracellular matrix to actin

Extracellular fibronectin binds an integrin spanning an animal-cell membrane, completing a physical connection from collagen in the extracellular matrix to actin inside the cell.

Type `INTEGRIN_CELL_MATRIX_ADHESION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-186cbe0b107d.js`; view `visualization-77b0b38d14bd.js` → `Visualization`.

#### Interferon antiviral signaling between cells

How does an infected cell warn nearby cells with antiviral interferon? Explain how antiviral interferon released by an infected cell induces protective gene expression in neighboring cells instead of directly destroying extracellular viruses.

Type `INTERFERON_ANTIVIRAL_SIGNALING_BETWEEN_CELLS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-afc926098422.js`; view `visualization-24b37e46ec7a.js` → `InterferonAntiviralSignalingBetweenCellsVisualization`.

#### Internal versus external fertilization

Internal versus external fertilization: In internal fertilization gametes join inside the reproductive tract; in external fertilization parents release gametes into an external environment, commonly water, where fertilization occurs.

Type `ANIMAL_INTERNAL_VERSUS_EXTERNAL_FERTILIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c7ac3f150e46.js`; view `visualization-93303391d1d3.js` → `AnimalInternalVersusExternalFertilizationVisualization`.

#### Interphase growth, DNA replication, and preparation

Type `INTERPHASE_GROWTH_AND_DNA_REPLICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ce51cb96bd01.js`; view `visualization-7e95ab963388.js` → `Visualization`.

#### Intestinal nutrient delivery through the hepatic portal vein

Animated hepatic portal circulation: one water-soluble nutrient crosses from the intestine into a blood capillary, follows the hepatic portal vein to the liver, and only then continues toward the heart.

Type `ANIMAL_HEPATIC_PORTAL_NUTRIENT_ROUTING` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-dd795f50e100.js`; view `visualization-3fdb3b2f62ab.js` → `AnimalHepaticPortalNutrientRoutingVisualization`.

#### invasive-species-competitive-displacement

Type `INVASIVE_SPECIES_COMPETITIVE_DISPLACEMENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e80de06881ec.js`; view `visualization-c52d6d73c73b.js` → `InvasiveSpeciesCompetitiveDisplacementVisualization`.

#### Inverted microscope image and opposite stage movement

Type `MICROSCOPY_INVERTED_IMAGE_STAGE_MOVEMENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2403f89fd437.js`; view `visualization-35b69c200204.js` → `Visualization`.

#### IP3 opens an ER channel and previously stored calcium ions activate a response

Calcium second-messenger animation: receptor signaling produces intracellular IP3, IP3 opens an endoplasmic-reticulum channel, previously stored calcium ions enter the cytoplasm, and a calcium-sensitive response activates.

Type `CALCIUM_SECOND_MESSENGER_RELAY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ffe400528963.js`; view `visualization-60a9c7b8f2e1.js` → `Visualization`.

#### Island colonization and evolutionary biogeography

Type `EVOLUTION_BIOGEOGRAPHY_ISLAND_COLONIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3ddd1b7f2f89.js`; view `visualization-7eca24f63b59.js` → `EvolutionBiogeographyIslandColonizationVisualization`.

#### Jawless versus jawed fish

Type `VERTEBRATE_JAWLESS_VERSUS_JAWED_FISH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-eeca5948c7c2.js`; view `visualization-98986561f876.js` → `Visualization`.

#### Kinesin and dynein vesicle transport

Compare plus-end-directed kinesin transport with minus-end-directed dynein transport on the same polarized microtubule.

Type `KINESIN_DYNEIN_VESICLE_TRANSPORT` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-432c209e1ce6.js`; view `visualization-aeeef1b2ff4c.js` → `Visualization`.

#### Lateral fluidity of the plasma membrane

Type `PLASMA_MEMBRANE_LATERAL_FLUIDITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-23e85f38633a.js`; view `visualization-2ddaed285505.js` → `Visualization`.

#### Leading-versus-lagging synthesis comparison

Type `DNA_REPLICATION_LEADING_LAGGING_STRAND_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a47564d8ff56.js`; view `visualization-b8d11c8102f8.js` → `DnaReplicationLeadingLaggingStrandComparisonVisualization`.

#### Leaf tissue and stomatal anatomy

Leaf cross section identifying protective epidermis, palisade and spongy mesophyll, a vein with xylem and phloem, and a stomatal pore between guard cells

Type `PLANT_LEAF_TISSUE_AND_STOMATA` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-519b5b544178.js`; view `visualization-17a4a7dbd11c.js` → `Visualization`.

#### Lichen fungal-algal symbiosis

Type `LICHEN_FUNGAL_ALGAL_SYMBIOSIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ce2c8996ae63.js`; view `visualization-a021c005bd21.js` → `Visualization`.

#### Life-history tradeoffs in offspring number and care

Type `POPULATION_ECOLOGY_LIFE_HISTORY_TRADEOFFS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f195fc53fca2.js`; view `visualization-32fe0f8ee57b.js` → `Visualization`.

#### Ligand dissociation and phosphatase-mediated phosphate removal terminate a cellular response

Signaling-termination animation: an active signal and cellular response begin together, the bound extracellular ligand dissociates, a phosphatase removes the kinase's existing phosphate, and the dependent response turns off.

Type `SIGNALING_PATHWAY_TERMINATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-056b02527aad.js`; view `visualization-5a78481fbdeb.js` → `Visualization`.

#### Linked chromosome loci favor parental over recombinant allele combinations

Type `LINKED_GENE_INHERITANCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9127482d87d3.js`; view `visualization-7fb78d757343.js` → `LinkedGeneInheritanceVisualization`.

#### Lipid classes overview

Type `LIPID_CLASSES_OVERVIEW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4d388e531655.js`; view `visualization-aac118b7a3b6.js` → `LipidClassesOverviewVisualization`.

#### Lipid hydrophobicity in water

Type `LIPID_HYDROPHOBICITY_IN_WATER` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a315e1c4a7f6.js`; view `visualization-f85e6aae7e75.js` → `LipidHydrophobicityInWaterVisualization`.

#### Lipid tail saturation and packing

Type `LIPID_TAIL_SATURATION_PACKING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-772703df0b68.js`; view `visualization-bc3afe594ffe.js` → `LipidTailSaturationPackingVisualization`.

#### Living seed: protective coat, stored food, and embryo

Inside a living seed: a protective seed coat surrounds stored food and a living plant embryo with an attached embryonic root.

Type `ORGANISM_SEED_STRUCTURE_AND_STORED_FOOD` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c8498b391a03.js`; view `visualization-aade4c6d3d6d.js` → `OrganismSeedStructureAndStoredFoodVisualization`.

#### Lobe-fin to tetrapod limb homology

Type `VERTEBRATE_LOBE_FIN_TO_TETRAPOD_LIMB_HOMOLOGY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-edb0bb920300.js`; view `visualization-9a09c1f705cf.js` → `Visualization`.

#### Logistic population growth and carrying capacity

Type `POPULATION_ECOLOGY_LOGISTIC_GROWTH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-da06ed90723c.js`; view `visualization-8cd139c3695b.js` → `Visualization`.

#### Long-bone growth at the growth plate

Type `MUSCULOSKELETAL_LONG_BONE_GROWTH_PLATE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-43845f929544.js`; view `visualization-7c19d744428a.js` → `MusculoskeletalLongBoneGrowthPlateVisualization`.

#### Long-bone structure and function

Type `MUSCULOSKELETAL_LONG_BONE_COMPACT_SPONGY_MARROW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5f5e13b6ab5b.js`; view `visualization-ce533a68371a.js` → `MusculoskeletalLongBoneCompactSpongyMarrowVisualization`.

#### Loop of Henle countercurrent concentration

Type `LOOP_OF_HENLE_COUNTERCURRENT_CONCENTRATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-bb7e74c71801.js`; view `visualization-b8ee7bcce79a.js` → `LoopOfHenleCountercurrentConcentrationVisualization`.

#### Lophotrochozoan versus ecdysozoan lineages

Type `ANIMAL_LOPHOTROCHOZOAN_VERSUS_ECDYSOZOAN_LINEAGES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1a0aea7b3410.js`; view `visualization-97d5621780be.js` → `AnimalLophotrochozoanVersusEcdysozoanLineagesVisualization`.

#### Lymphocyte development and recirculation

How do B and T lymphocytes mature and recirculate to survey secondary lymphoid organs? Distinguish B-cell maturation in bone marrow from T-cell maturation in the thymus and trace both mature lymphocyte populations through blood and lymph to secondary lymphoid surveillance sites.

Type `LYMPHOCYTE_DEVELOPMENT_RECIRCULATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-b6d38700d2b7.js`; view `visualization-5a87bddd2b1b.js` → `LymphocyteDevelopmentRecirculationVisualization`.

#### Magnification versus resolving power

Type `MICROSCOPY_MAGNIFICATION_VERSUS_RESOLVING_POWER` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-14ad585f6688.js`; view `visualization-b6e638bdbb5b.js` → `Visualization`.

#### Major animal phyla and representative body plans

Type `ANIMAL_MAJOR_PHYLA_AND_BODY_PLAN_TRAITS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-61ce21314989.js`; view `visualization-7f9a8b5a3577.js` → `AnimalMajorPhylaAndBodyPlanTraitsVisualization`.

#### Male reproductive anatomy and sperm route

Male reproductive anatomy and sperm route: Sperm form in the testes, mature in the epididymis, travel through the vas deferens, join secretions from accessory glands near the prostate, and leave through the urethra; the urinary bladder is a nearby landmark, not the source of sperm.

Type `ANIMAL_MALE_REPRODUCTIVE_ANATOMY_SPERM_ROUTE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-52d53df3c9e7.js`; view `visualization-b0ddb7d9e33e.js` → `AnimalMaleReproductiveAnatomySpermRouteVisualization`.

#### Mammalian airway, lungs, and alveolar exchange anatomy

Mammalian respiratory anatomy: one trachea branches into both recognizable lungs and connects to enlarged alveoli, where oxygen crosses from air into pulmonary blood and carbon dioxide crosses back into alveolar air.

Type `ANIMAL_RESPIRATORY_AIRWAY_AND_LUNG_ANATOMY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e72cfd1bca46.js`; view `visualization-bd4c2fa8cd11.js` → `AnimalRespiratoryAirwayAndLungAnatomyVisualization`.

#### Mammalian pulmonary and systemic double circulation

Mammalian double circulation: the pulmonary circuit carries oxygen-poor blood from the right heart to the lungs and returns oxygen-rich blood to the left heart, while the systemic circuit carries it to body tissues and returns oxygen-poor blood to the right heart.

Type `ANIMAL_PULMONARY_AND_SYSTEMIC_CIRCULATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c64ab2df2499.js`; view `visualization-150846345bae.js` → `AnimalPulmonaryAndSystemicCirculationVisualization`.

#### Mammalian urinary system anatomy

Type `MAMMALIAN_URINARY_SYSTEM_ANATOMY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9183bd73705b.js`; view `visualization-b0a9840078eb.js` → `MammalianUrinarySystemAnatomyVisualization`.

#### Marine fish osmoregulation

Type `MARINE_FISH_OSMOREGULATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c550cf95a1b9.js`; view `visualization-da898801b971.js` → `MarineFishOsmoregulationVisualization`.

#### Mass-extinction survival and adaptive radiation

Type `MASS_EXTINCTION_SURVIVAL_AND_ADAPTIVE_RADIATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8f0079451279.js`; view `visualization-df32ff00795d.js` → `MassExtinctionSurvivalAndAdaptiveRadiationVisualization`.

#### Matched heterozygotes distinguish uniform blending from codominance

Type `INCOMPLETE_DOMINANCE_VERSUS_CODOMINANCE` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-a0ef520456c3.js`; view `visualization-b700798a921a.js` → `IncompleteDominanceVersusCodominanceVisualization`.

#### Maternal allele silencing makes the same nuclear variant depend on its parent of origin

Type `GENOMIC_IMPRINTING_PARENT_OF_ORIGIN` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f8aac9842be6.js`; view `visualization-2fa68ee12313.js` → `GenomicImprintingParentOfOriginVisualization`.

#### Maternal mitochondrial transmission compared with no paternal transmission

Type `MITOCHONDRIAL_MATERNAL_INHERITANCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9cc835a152fb.js`; view `visualization-17bc58c76fc1.js` → `MitochondrialMaternalInheritanceVisualization`.

#### Matter cycles while energy flows

Why can atoms cycle through an ecosystem while usable energy must enter and leave? Distinguish conserved cycling matter from usable energy that enters as sunlight and leaves organisms as dispersed heat.

Type `BIOGEOCHEMICAL_MATTER_CYCLING_VERSUS_ENERGY_FLOW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f76c55fd1b22.js`; view `visualization-dcdd05bb5e85.js` → `Visualization`.

#### Mature mRNA structure

Type `MATURE_MRNA_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-49869326c395.js`; view `visualization-343cc4ca51fc.js` → `Visualization`.

#### Measured image size, actual specimen size, and magnification

Type `MICROSCOPY_IMAGE_SIZE_ACTUAL_SIZE_MAGNIFICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-aa7e4e9c7882.js`; view `visualization-d3180d805c33.js` → `Visualization`.

#### Measurement accuracy and precision

Type `BIOLOGICAL_MEASUREMENT_ACCURACY_AND_PRECISION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8b3293eb3b2f.js`; view `visualization-c8e3e9094d64.js` → `BiologicalMeasurementAccuracyAndPrecisionVisualization`.

#### Meiosis I separates intact replicated homologs and reduces diploid cells to haploid

Type `HOMOLOGOUS_CHROMOSOME_SEGREGATION_MEIOSIS_ONE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4fd95528f685.js`; view `visualization-9cc65f9921a7.js` → `Visualization`.

#### Meiosis II separates sister chromatids while preserving one haploid chromosome set

Type `SISTER_CHROMATID_SEGREGATION_MEIOSIS_TWO` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1933f57a34c9.js`; view `visualization-194b3d7788fe.js` → `Visualization`.

#### Meiosis-I nondisjunction sends both homologs together and produces four abnormal gametes

Type `MEIOSIS_ONE_NONDISJUNCTION_SEGREGATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-46c3ec3902e8.js`; view `visualization-9bb90d9f9b15.js` → `Visualization`.

#### Meiosis-II nondisjunction in one branch leaves two normal and two abnormal gametes

Type `MEIOSIS_TWO_NONDISJUNCTION_SEGREGATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8520cf5c3419.js`; view `visualization-c10ce6be04b2.js` → `Visualization`.

#### Membrane bilayer polarity

Type `MEMBRANE_BILAYER_POLARITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-549b648a502a.js`; view `visualization-abccda97e884.js` → `MembraneBilayerPolarityVisualization`.

#### Membrane-bound compartments within one eukaryotic cell

Type `CELLULAR_COMPARTMENTALIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-47e4ca3ded08.js`; view `visualization-95f9382209ea.js` → `Visualization`.

#### Membrane-bound ligand signals a touching neighboring cell

A membrane-bound ligand on one cell binds the matching receptor of a touching neighbor, and only that target cell responds.

Type `DIRECT_CONTACT_CELL_SIGNALING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d8a0405176cd.js`; view `visualization-d54c74bba783.js` → `DirectContactCellSignalingVisualization`.

#### Mendelian garden-pea P, F1, and F2 inheritance overview

Type `MENDELIAN_GENETICS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-9cd861e080d5.js`; view `visualization-5ead6d550c14.js` → `Visualization`.

#### Metamorphosis from larva to adult

Metamorphosis from larva to adult: A frog develops from an aquatic tadpole into a froglet as limbs emerge and the tail recedes; the resulting adult frog has a different body plan and no larval tail.

Type `ANIMAL_METAMORPHOSIS_LARVA_TO_ADULT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c0c9f0d5ebec.js`; view `visualization-51c36ff27571.js` → `AnimalMetamorphosisLarvaToAdultVisualization`.

#### Microscope illumination and image path

Type `MICROSCOPY_ILLUMINATION_TO_EYEPIECE_PATH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3c830228c3fc.js`; view `visualization-b04c32fcb02a.js` → `Visualization`.

#### Microscopy scale bar cell measurement

Type `MICROSCOPY_SCALE_BAR_CELL_MEASUREMENT` · manifest v1 · not in the type enum.

Source: manifest `type-e95d6b1ca1f3.js`; view `visualization-fce9170cc5fb.js` → `Visualization`.

#### Microtubule polarity and growth

Explain how tubulin dimers add preferentially at a microtubule plus end while its minus end remains associated with the organizing center.

Type `MICROTUBULE_POLARITY_AND_GROWTH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8b1bee59d525.js`; view `visualization-31241a513f9d.js` → `Visualization`.

#### Missense amino-acid substitution

Type `MUTATION_MISSENSE_SUBSTITUTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b3afddd2f55b.js`; view `visualization-1dfe42deed83.js` → `Visualization`.

#### Mitochondrion structure and ATP production

Type `MITOCHONDRION_STRUCTURE_AND_ATP_PRODUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ac46f1238339.js`; view `visualization-2371a7e261fd.js` → `Visualization`.

#### Molecular sequence similarity

Type `EVOLUTION_MOLECULAR_SEQUENCE_SIMILARITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ac1b1b4528e3.js`; view `visualization-e6ed46951728.js` → `EvolutionMolecularSequenceSimilarityVisualization`.

#### Mollusk foot modifications

Type `ANIMAL_MOLLUSK_FOOT_MODIFICATIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1df450b5a80b.js`; view `visualization-802ba3728622.js` → `AnimalMolluskFootModificationsVisualization`.

#### Mollusk mantle, foot, and visceral mass

Type `ANIMAL_MOLLUSK_MANTLE_FOOT_VISCERAL_MASS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7142547afcd9.js`; view `visualization-eb4315ae8e32.js` → `AnimalMolluskMantleFootVisceralMassVisualization`.

#### Monophyletic clade membership

Type `MONOPHYLETIC_CLADE_MEMBERSHIP` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9cec470e9471.js`; view `visualization-a1144ba1ab16.js` → `Visualization`.

#### Moss gametophyte and sporophyte life cycle

Trace a dominant haploid moss gametophyte through sperm-egg fusion, a diploid zygote and attached sporophyte, meiosis in its capsule, and a haploid spore that establishes a new gametophyte.

Type `MOSS_GAMETOPHYTE_SPOROPHYTE_LIFE_CYCLE` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-8887b8fd3dec.js`; view `visualization-5bf850a1d21a.js` → `MossGametophyteSporophyteLifeCycleVisualization`.

#### Motile cilium axoneme structure

Interpret the 9+2 axonemal arrangement of nine outer microtubule doublets surrounding a central microtubule pair and identify dynein arms.

Type `MOTILE_CILIUM_AXONEME_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-30de38936a0c.js`; view `visualization-fa92b1774d85.js` → `Visualization`.

#### Motor-unit recruitment and force

Type `MUSCULOSKELETAL_MOTOR_UNIT_RECRUITMENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-eefe1b0d8c69.js`; view `visualization-677e8138d7ac.js` → `MusculoskeletalMotorUnitRecruitmentVisualization`.

#### mRNA matches coding DNA except for thymine-to-uracil substitution

Type `CODING_STRAND_MRNA_SEQUENCE_RELATIONSHIP` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-92ba5f9b9ddc.js`; view `visualization-21ef7f8d5c70.js` → `CodingStrandMrnaSequenceRelationshipVisualization`.

#### Multicellular cell, tissue, and organ hierarchy

Type `MULTICELLULAR_CELL_TISSUE_ORGAN_HIERARCHY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-eb93226f8795.js`; view `visualization-4a9bcc04819d.js` → `Visualization`.

#### Multiple tissues build a functional organ

Type `MULTICELLULAR_TISSUES_BUILD_ORGANS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ef89c323f7bf.js`; view `visualization-9a1553598682.js` → `Visualization`.

#### Mutation codon reading frame

Type `MUTATION_CODON_READING_FRAME` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6ea333a284e9.js`; view `visualization-5f1572b3be56.js` → `Visualization`.

#### Mutation DNA to cellular phenotype

Type `MUTATION_DNA_RNA_PROTEIN_PHENOTYPE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-867ac10bacdb.js`; view `visualization-8073f01941be.js` → `Visualization`.

#### Mutualism cleaning partnership

Type `MUTUALISM_CLEANING_PARTNERSHIP` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-58a325bee689.js`; view `visualization-d93626db07d1.js` → `MutualismCleaningPartnershipVisualization`.

#### Mycorrhizal mutualism

Type `MYCORRHIZAL_MUTUALISM` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ba78afa4c3b9.js`; view `visualization-116732e6f32c.js` → `Visualization`.

#### Myelinated versus unmyelinated conduction

Equal-length axons carry equal-sized signals. The unmyelinated signal advances continuously, while the myelinated signal reaches exposed nodes and the endpoint sooner.

Type `MYELINATED_VERSUS_UNMYELINATED_CONDUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cd97efba78f5.js`; view `visualization-d2ffa8996889.js` → `MyelinatedVersusUnmyelinatedConductionVisualization`.

#### Natural killer cell missing-self recognition

How does a natural killer cell detect an infected cell that has lost MHC I? Explain how natural killer cells preserve healthy MHC-I-positive host cells while recognizing reduced self-MHC I as one trigger for innate killing of an infected or abnormal cell.

Type `NATURAL_KILLER_CELL_MISSING_SELF_RECOGNITION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-a79320848a80.js`; view `visualization-bd3ec6895ab5.js` → `NaturalKillerCellMissingSelfRecognitionVisualization`.

#### Natural selection and differential reproduction

Type `NATURAL_SELECTION_DIFFERENTIAL_REPRODUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9f3be931acd6.js`; view `visualization-21e1371945a5.js` → `NaturalSelectionDifferentialReproductionVisualization`.

#### Natural selection and differential survival

Type `NATURAL_SELECTION_DIFFERENTIAL_SURVIVAL` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b69500996b7c.js`; view `visualization-469496c670f2.js` → `NaturalSelectionDifferentialSurvivalVisualization`.

#### Natural selection through differential reproduction

Type `POPULATION_GENETICS_SELECTION_DIFFERENTIAL_REPRODUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-60e2070dd38f.js`; view `visualization-5c4cb7615176.js` → `Visualization`.

#### Nephron anatomy across cortex and medulla

Type `NEPHRON_ANATOMY_CORTEX_MEDULLA` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1cf35a26845a.js`; view `visualization-ae57687fa3b9.js` → `NephronAnatomyCortexMedullaVisualization`.

#### Nervous, muscular, and skeletal systems coordinate movement

Type `NERVOUS_MUSCULAR_SKELETAL_MOVEMENT` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-eceb82f62656.js`; view `visualization-ba4abf31f9d7.js` → `Visualization`.

#### Nested intestinal folds, villi, and epithelial microvilli

Intestinal absorption-surface comparison: broad folds carry many finger-like villi, and one villus epithelial cell bears a dense brush border of microvilli, so the three nested structural scales together increase the surface available for nutrient absorption.

Type `ANIMAL_INTESTINAL_FOLDS_VILLI_AND_MICROVILLI` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-46ee491c27f6.js`; view `visualization-432e3e6eeb29.js` → `AnimalIntestinalFoldsVilliAndMicrovilliVisualization`.

#### Neuroendocrine negative feedback

Type `NEUROENDOCRINE_NEGATIVE_FEEDBACK` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d2c67a2d1e11.js`; view `visualization-5a10da8b79a4.js` → `Visualization`.

#### Neuromuscular junction transmission

Type `MUSCULOSKELETAL_NEUROMUSCULAR_JUNCTION_TRANSMISSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f682a67626fb.js`; view `visualization-93671564a9b1.js` → `MusculoskeletalNeuromuscularJunctionTransmissionVisualization`.

#### Neuron anatomy and signal direction

A multipolar neuron has dendrites and a soma on the left, a continuous myelinated axon, and axon terminals on the right; a signal travels from dendrites toward terminals.

Type `NEURON_ANATOMY_AND_SIGNAL_DIRECTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-12666ffdf8fa.js`; view `visualization-dfbf94087c10.js` → `NeuronAnatomyAndSignalDirectionVisualization`.

#### Neuronal resting potential and ion gradients

A resting neuronal membrane has more sodium outside and potassium inside. An outward potassium leak contributes to a negative interior near minus 70 millivolts.

Type `NEURONAL_RESTING_POTENTIAL_ION_GRADIENTS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ca7d004370ba.js`; view `visualization-2368d1b09e50.js` → `NeuronalRestingPotentialIonGradientsVisualization`.

#### Neurons and muscle cells express different genes from the same genome

Differential gene expression: nerve and muscle cells contain the same genes, but each activates its own associated gene and produces its matching RNA and proteins.

Type `NEURON_VERSUS_MUSCLE_GENE_EXPRESSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b8052381e876.js`; view `visualization-a745a2a481ef.js` → `Visualization`.

#### Neurons, synapses, and neural circuits

A neuron sends a directional electrical signal to a chemical synapse, and connected neurons form a central sensory-to-motor neural circuit.

Type `NEURONS_SYNAPSES_AND_NEURAL_CIRCUITS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f20bb932bb7c.js`; view `visualization-ac0aff75ee85.js` → `NeuronsSynapsesAndNeuralCircuitsVisualization`.

#### Neurotransmitter reuptake and synaptic clearance

A neurotransmitter leaves its postsynaptic receptor, travels back into the presynaptic terminal through a reuptake transporter, and the postsynaptic signal ends.

Type `NEUROTRANSMITTER_REUPTAKE_AND_CLEARANCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7c1af0bff819.js`; view `visualization-e1799fd6553b.js` → `NeurotransmitterReuptakeAndClearanceVisualization`.

#### Nitrification and denitrification

How do ammonium, nitrite, and nitrate connect before nitrogen returns to the atmosphere? Distinguish nitrification's ordered ammonium-to-nitrite-to-nitrate sequence from denitrification's nitrate-to-nitrogen-gas return.

Type `BIOGEOCHEMICAL_NITROGEN_NITRIFICATION_AND_DENITRIFICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-19d786cf3a01.js`; view `visualization-f4402cebb2aa.js` → `Visualization`.

#### Nitrogen ammonification and decomposition

How do decomposers return nitrogen from organic matter to soil as ammonium? Explain that decomposers convert nitrogen in organic wastes and remains into soil ammonium through ammonification.

Type `BIOGEOCHEMICAL_NITROGEN_AMMONIFICATION_AND_DECOMPOSITION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d12b6f865d56.js`; view `visualization-9742aeaaf79d.js` → `Visualization`.

#### Nitrogen reservoirs and transformations

Which nitrogen forms connect the atmosphere, organisms, and soil? Distinguish atmospheric nitrogen gas, organic nitrogen, ammonium, nitrite, and nitrate and place them in their connected cycle.

Type `BIOGEOCHEMICAL_NITROGEN_RESERVOIRS_AND_TRANSFORMATIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d15ab1bb70cb.js`; view `visualization-826c58edf83c.js` → `Visualization`.

#### Nonsense mutation premature stop

Type `MUTATION_NONSENSE_PREMATURE_STOP` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-65285c5241d7.js`; view `visualization-bb2787669e6d.js` → `Visualization`.

#### Nonvascular epithelium and connective blood supply

Type `EPITHELIAL_NONVASCULAR_CONNECTIVE_TISSUE_BLOOD_SUPPLY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2553d85b2745.js`; view `visualization-19305e8b64bc.js` → `EpithelialNonvascularConnectiveTissueBloodSupplyVisualization`.

#### Nonvascular versus vascular plants

Distinguish nonvascular mosses from vascular ferns by comparing localized surface absorption with connected conducting tissue.

Type `PLANT_NONVASCULAR_VERSUS_VASCULAR_TISSUE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8df93f6c376d.js`; view `visualization-5c9641915296.js` → `PlantNonvascularVersusVascularTissueVisualization`.

#### Normal cell contact stops growth while contact-insensitive cells keep piling up

Type `DENSITY_DEPENDENT_CONTACT_INHIBITION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-84e53f4d916e.js`; view `visualization-99cb4ab83bf4.js` → `Visualization`.

#### Nucleic acids

DNA has two complementary strands with A-T and G-C base pairs, while RNA is usually one strand and uses U instead of T.

Type `NUCLEIC_ACIDS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-559d658f1bc7.js`; view `visualization-7c6489eedfbc.js` → `Visualization`.

#### Nucleic-acid polymerization

A new nucleotide joins the free 3-prime end of an existing strand, extending the strand in the 5-prime-to-3-prime direction and creating a new 3-prime end.

Type `NUCLEIC_ACID_POLYMERIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-15d314d9a413.js`; view `visualization-fe5ec51f432c.js` → `Visualization`.

#### Nucleotide structure

One nucleotide contains a phosphate group attached to a five-carbon sugar and a nitrogenous base, with distinct 5-prime and 3-prime landmarks.

Type `NUCLEOTIDE_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-47efaf198b89.js`; view `visualization-d3ad1a3c1e3a.js` → `Visualization`.

#### Nucleus and ribosome functions

Type `NUCLEUS_AND_RIBOSOME_FUNCTIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ee04370f5b4d.js`; view `visualization-144e9f3862c6.js` → `Visualization`.

#### Nutrient runoff and eutrophication

Why can excess nitrogen or phosphorus runoff eventually reduce dissolved oxygen in a lake? Explain the causal sequence from excess nitrogen or phosphorus runoff to algal bloom, decomposer respiration, and lower dissolved oxygen.

Type `BIOGEOCHEMICAL_NUTRIENT_RUNOFF_AND_EUTROPHICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-fd6b1f69df6b.js`; view `visualization-7c482f4ee28d.js` → `Visualization`.

#### Objective power and field of view

Type `MICROSCOPY_OBJECTIVE_POWER_FIELD_OF_VIEW` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-d76cf63ba314.js`; view `visualization-14e5d764e733.js` → `Visualization`.

#### Ocean-atmosphere carbon exchange

Can carbon dioxide move both into the ocean and back into the atmosphere? Explain that atmospheric and surface-ocean carbon exchange is bidirectional rather than a one-way permanent removal.

Type `BIOGEOCHEMICAL_CARBON_OCEAN_ATMOSPHERE_EXCHANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5aeed8fabbff.js`; view `visualization-955a7fcc16b6.js` → `Visualization`.

#### Okazaki-fragment maturation and joining

Type `DNA_REPLICATION_OKAZAKI_FRAGMENT_JOINING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-fd02dcfeacd9.js`; view `visualization-80f83c822e55.js` → `DnaReplicationOkazakiFragmentJoiningVisualization`.

#### Oldest fossil and an unsampled ghost lineage

Type `OLDEST_FOSSIL_AND_UNSAMPLED_GHOST_LINEAGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-216aa557c026.js`; view `visualization-7ab1e3f4c9ac.js` → `OldestFossilAndUnsampledGhostLineageVisualization`.

#### One affected X allele passes from a grandfather through his carrier daughter to an affected grandson without father-to-son transmission

Type `MENDELIAN_X_LINKED_PEDIGREE_GRANDFATHER_TO_GRANDSON_TRANSMISSION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-385e9e52f941.js`; view `visualization-c9a2158f5db1.js` → `Visualization`.

#### One aligned four-chromatid meiotic tetrad preserves maternal and paternal loci

Type `HOMOLOGOUS_CHROMOSOME_PAIRING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7b8c4c4307c7.js`; view `visualization-fe6d0bee225c.js` → `Visualization`.

#### One bacterial cell compared with many cooperating animal cells

One bacterial cell functions as a complete unicellular organism, while four distinct animal cells cooperate as a tissue in a multicellular organism.

Type `CELL_THEORY_UNICELLULAR_AND_MULTICELLULAR` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-138f34a0c4e3.js`; view `visualization-5f9e152bd154.js` → `Visualization`.

#### One bacterium biases run-and-tumble movement toward an attractant

Type `BACTERIAL_CHEMOTAXIS_RUN_AND_TUMBLE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d1b77d25749f.js`; view `visualization-44497b66657b.js` → `BacterialChemotaxisRunAndTumbleVisualization`.

#### One biological outlier shifts the mean but not the median

Type `BIOLOGICAL_OUTLIER_EFFECTS_ON_MEAN_AND_MEDIAN` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-17e25ff46a6a.js`; view `visualization-caf2edc683e7.js` → `BiologicalOutlierEffectsOnMeanAndMedianVisualization`.

#### One cell secretes and receives its own extracellular signal

One cell secretes a signaling molecule into extracellular fluid, receives it at its own matching receptor, and responds to its own signal.

Type `AUTOCRINE_CELL_SIGNALING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ef11fd8d8bd3.js`; view `visualization-dc77daa257dc.js` → `AutocrineCellSignalingVisualization`.

#### One chromosome before and after sister-chromatid duplication

Type `CHROMOSOME_SISTER_CHROMATID_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6b03cb5fae86.js`; view `visualization-5c396da04c44.js` → `Visualization`.

#### One diploid germ cell divides into four genetically distinguishable haploid gametes

Type `MEIOSIS_AND_GENETIC_DIVERSITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-903f216ef2d9.js`; view `visualization-d518b15aedea.js` → `Visualization`.

#### One DNA sequence substitution changes the corresponding RNA message

Type `DNA_SEQUENCE_CHANGE_RNA_MESSAGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c4fe17689039.js`; view `visualization-59ac381f237f.js` → `DnaSequenceChangeRnaMessageVisualization`.

#### One enclosed secretory protein travels from rough ER through Golgi to outside

Type `ENDOMEMBRANE_TRAFFICKING` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-4d983c1481e8.js`; view `visualization-f0a90167a339.js` → `Visualization`.

#### One endocrine hormone travels through blood to a distant target

One endocrine hormone leaves its source, travels through a continuous blood vessel, and activates a matching receptor on a distant target cell.

Type `ENDOCRINE_LONG_DISTANCE_SIGNALING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f6c683cdbc60.js`; view `visualization-f6f3c7e270c6.js` → `EndocrineLongDistanceSignalingVisualization`.

#### One existing animal cell divides into two daughter cells

One pre-existing animal cell constricts and divides into exactly two daughter cells, showing that new cells arise from existing cells.

Type `CELL_THEORY_CELLS_FROM_EXISTING_CELLS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e98c48550afd.js`; view `visualization-80a81fb035f8.js` → `Visualization`.

#### One extracellular ligand drives ordered reception, transduction, and response

Reception-to-response animation: one extracellular ligand binds its receptor, intracellular relay proteins activate in order, and the downstream cellular response switches on.

Type `RECEPTION_TRANSDUCTION_RESPONSE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d1c80e1d0db4.js`; view `visualization-18c31924e76d.js` → `Visualization`.

#### One genotype responds phenotypically after environmental water increases

One plant keeps the same inherited genotype as its environmental water supply increases and its observable height subsequently grows.

Type `PHENOTYPIC_PLASTICITY_ENVIRONMENTAL_RESPONSE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2be4dee1b436.js`; view `visualization-7fed8921372d.js` → `Visualization`.

#### One lipid-soluble hormone crosses the membrane and binds inside the cell

One lipid-soluble hormone crosses the plasma membrane, binds a receptor inside the cell, and travels with that receptor toward the nucleus.

Type `INTRACELLULAR_RECEPTOR_HORMONE_BINDING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-be1fb62525a4.js`; view `visualization-5f025d21d10f.js` → `IntracellularReceptorHormoneBindingVisualization`.

#### One morphogen concentration gradient specifies three genome-matched cell fates

Morphogen concentration and cell fate: one localized signal decreases across three stationary cells, so high, medium, and low exposures specify neuronal, muscular, and secretory identities even though each cell retains the same genome.

Type `MORPHOGEN_CONCENTRATION_AND_CELL_FATE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-91baef91fb80.js`; view `visualization-ce94f1c6b7af.js` → `Visualization`.

#### One neurotransmitter crosses a short extracellular synaptic cleft

A neuron releases one neurotransmitter across a narrow synaptic cleft to the matching receptor of a postsynaptic target cell.

Type `SYNAPTIC_CELL_SIGNALING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-66f5a1e9f035.js`; view `visualization-82b389a2971a.js` → `SynapticCellSignalingVisualization`.

#### One Pp homologous allele pair segregates into separate haploid gametes

Type `MENDELIAN_ALLELE_SEGREGATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8996a01b4d7e.js`; view `visualization-8cfcd844c7b6.js` → `Visualization`.

#### One pre-mRNA containing three identifiable exons is alternatively spliced into two mature RNA exon combinations that encode different protein isoforms.

Type `ALTERNATIVE_RNA_SPLICING_PROTEIN_ISOFORMS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9bb3ea7504d6.js`; view `visualization-ee1dd0067e8f.js` → `Visualization`.

#### One receptor input becomes two, four, and eight countable activated downstream targets

Signal-amplification animation: one extracellular signal activates one receptor, then two, four, and finally eight individually countable downstream targets without creating any additional ligand.

Type `SIGNAL_AMPLIFICATION_CASCADE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-968519e2786a.js`; view `visualization-e25bd3aff1a4.js` → `Visualization`.

#### One reciprocal prophase-I crossover changes only two non-sister chromatids

Type `MEIOTIC_CROSSING_OVER_RECOMBINATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e252b29c9c09.js`; view `visualization-f64b63504076.js` → `Visualization`.

#### One typical XY germ cell separates X and Y in meiosis I and produces two X-bearing and two Y-bearing gametes after meiosis II

Type `MEIOTIC_SEX_CHROMOSOME_SEGREGATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-36434ad5d741.js`; view `visualization-800ac54fb33e.js` → `Visualization`.

#### One-base deletion frameshift

Type `MUTATION_DELETION_FRAMESHIFT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-dae82b908220.js`; view `visualization-501c516f2049.js` → `Visualization`.

#### One-base insertion frameshift

Type `MUTATION_INSERTION_FRAMESHIFT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cc1dd2f67540.js`; view `visualization-4e8130876ad8.js` → `Visualization`.

#### Only the receptor-bearing cell responds to a shared extracellular signal

One signal passes a receptor-free bystander and binds a matching receptor on another cell; only the receptor-bearing target responds.

Type `TARGET_CELL_RECEPTOR_SPECIFICITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-89cfdf3518e2.js`; view `visualization-3cee63568a0c.js` → `TargetCellReceptorSpecificityVisualization`.

#### Open insect circulation versus closed fish circulation

Recognizable insect and fish circulation comparison: insect hemolymph leaves the dorsal vessel and directly bathes body tissues, while fish blood remains enclosed inside one connected closed blood-vessel circuit.

Type `ANIMAL_OPEN_VERSUS_CLOSED_CIRCULATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-14474e6a1a00.js`; view `visualization-b5cca7416314.js` → `AnimalOpenVersusClosedCirculationVisualization`.

#### Ordered AUG GCU ACC UAA mRNA codons produce Met Ala Thr and stop

Type `MRNA_CODON_AMINO_ACID_SEQUENCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ede2bb873d62.js`; view `visualization-6dca05b94a5b.js` → `MrnaCodonAminoAcidSequenceVisualization`.

#### Ordered chromosome alignment, attachment, separation, and nuclear reformation

Type `MITOSIS_CHROMOSOME_SEGREGATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-dace53f04818.js`; view `visualization-25f6bad19ef5.js` → `Visualization`.

#### Organic-carbon burial and long-term geological storage

How does a small fraction of organic carbon enter long-term geological storage? Compare ordinary decomposer-mediated atmospheric return with slow burial of some conserved organic carbon into geological storage.

Type `BIOGEOCHEMICAL_CARBON_BURIAL_AND_GEOLOGICAL_STORAGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-71205a4ffa8c.js`; view `visualization-441c09f260bb.js` → `Visualization`.

#### Origin of life

Type `ORIGIN_OF_LIFE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d95bac035d6b.js`; view `visualization-4851365375ed.js` → `Visualization`.

#### Osmoregulator versus osmoconformer

Type `OSMOREGULATOR_VERSUS_OSMOCONFORMER` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-dc5c5dc65787.js`; view `visualization-7438fdd6d365.js` → `OsmoregulatorVersusOsmoconformerVisualization`.

#### Osmosis across a selectively permeable membrane

Type `OSMOSIS_ACROSS_SELECTIVELY_PERMEABLE_MEMBRANE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9865b84bddc0.js`; view `visualization-2460c1a89ef5.js` → `Visualization`.

#### Outgroup and rooted ingroup

Type `PHYLOGENETIC_OUTGROUP_ROOTING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f43d45b6ce67.js`; view `visualization-549fe88607e4.js` → `Visualization`.

#### Oviparous versus viviparous development

Oviparous versus viviparous development: Oviparous animals lay eggs that complete development outside the parent's body, while viviparous animals retain the developing offspring internally and later give birth to live young.

Type `ANIMAL_OVIPAROUS_VERSUS_VIVIPAROUS_DEVELOPMENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-281c7b0fdce4.js`; view `visualization-3b8b67fc2e17.js` → `AnimalOviparousVersusViviparousDevelopmentVisualization`.

#### Ovulation, fertilization, and implantation

Ovulation, fertilization, and implantation: An ovary releases an oocyte, fertilization usually occurs after it enters a uterine tube, and the developing embryo subsequently travels to and implants in the uterine lining.

Type `ANIMAL_OVULATION_FERTILIZATION_IMPLANTATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7fc66abbad67.js`; view `visualization-cea5fbe641ce.js` → `AnimalOvulationFertilizationImplantationVisualization`.

#### Paramecium cell structure

Type `PARAMECIUM_CELL_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1ca05a6f8caf.js`; view `visualization-42995d2f0314.js` → `Visualization`.

#### Paramecium ciliary feeding

Type `PARAMECIUM_CILIARY_FEEDING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2812b151314b.js`; view `visualization-ade2280d03b2.js` → `Visualization`.

#### Paramecium conjugation genetic exchange

Type `PARAMECIUM_CONJUGATION_GENETIC_EXCHANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-10c6b91f46d9.js`; view `visualization-a7247db7aea3.js` → `Visualization`.

#### Parasitism host exploitation

Type `PARASITISM_HOST_EXPLOITATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e2995816cc04.js`; view `visualization-b11dd45aa9ff.js` → `ParasitismHostExploitationVisualization`.

#### Passive versus active membrane transport

Type `PASSIVE_VERSUS_ACTIVE_MEMBRANE_TRANSPORT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-60c0f2051182.js`; view `visualization-794e84a5547a.js` → `Visualization`.

#### Pasteur swan-neck control compared with airborne contamination

Two matched air-exposed flasks contain sterile broth. The intact swan neck traps airborne microbes and stays clear, while the broken neck admits a microbe and its broth turns cloudy.

Type `CELL_THEORY_PASTEUR_SWAN_NECK_EXPERIMENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-176ec8799755.js`; view `visualization-9cf6633a544b.js` → `Visualization`.

#### Pathogen types

How do bacteria, viruses, fungi, and protists differ? Distinguish the cellular bacterium, acellular virus, budding fungus, and nucleated protist as four structurally different categories that may contain pathogens.

Type `PATHOGEN_TYPES_BACTERIA_VIRUSES_FUNGI_PROTISTS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-fa708737a87c.js`; view `visualization-984d4be5b883.js` → `PathogenTypesBacteriaVirusesFungiProtistsVisualization`.

#### PCR exponential DNA amplification

A branching molecular PCR diagram starts with one DNA duplex and successively shows two, four, and eight traceable double-stranded target copies beside a recognizable thermal cycler.

Type `PCR_EXPONENTIAL_DNA_AMPLIFICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c5e965dedd58.js`; view `visualization-95e8d6946f38.js` → `Visualization`.

#### PCR primer-directed extension

Two separated DNA template strands receive inward-facing primers; two recognizable DNA polymerases extend opposite complementary product strands 5′ to 3′ across the same bounded target.

Type `PCR_PRIMER_DIRECTED_EXTENSION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-9286f48637e3.js`; view `visualization-b0f015f57acb.js` → `Visualization`.

#### PCR temperature cycle

Three adjacent molecular DNA states compare separated template strands at 95 °C, complementary primers bound near 55 °C, and newly synthesized complementary strands near 72 °C beside a recognizable thermal cycler.

Type `PCR_TEMPERATURE_CYCLE_OVERVIEW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b1f5bdff361b.js`; view `visualization-b28a69743627.js` → `Visualization`.

#### Pepsin and trypsin have different pH activity optima

Type `ENZYME_PH_ACTIVITY_PROFILES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-514aee4664b9.js`; view `visualization-4e3038ba607a.js` → `Visualization`.

#### Peptide-bond formation

Type `PEPTIDE_BOND_FORMATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-74770209df91.js`; view `visualization-cb36195408d2.js` → `PeptideBondFormationVisualization`.

#### Peroxisome catalase compartmentalizes hydrogen peroxide detoxification

Type `PEROXISOME_DETOXIFICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c73b720d8ff4.js`; view `visualization-c600ff923291.js` → `Visualization`.

#### pH and enzyme active-site charge

Type `BIOLOGICAL_PH_ENZYME_ACTIVE_SITE_CHARGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a9265b5284a6.js`; view `visualization-3717684cf916.js` → `Visualization`.

#### Phagocytosis and phagolysosome digestion

How does a phagocyte engulf and digest a captured bacterium? Explain how receptor-mediated engulfment encloses a pathogen in a phagosome and lysosome fusion creates a degradative phagolysosome.

Type `IMMUNE_PHAGOCYTOSIS_PHAGOLYSOSOME_DIGESTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-47fb4096cea6.js`; view `visualization-e2cdff2c51dd.js` → `ImmunePhagocytosisPhagolysosomeDigestionVisualization`.

#### Phanerozoic Paleozoic, Mesozoic, and Cenozoic eras

Type `PHANEROZOIC_PALEOZOIC_MESOZOIC_CENOZOIC_ERAS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-582c2660c9dc.js`; view `visualization-456ed34a62bf.js` → `PhanerozoicPaleozoicMesozoicCenozoicErasVisualization`.

#### Phloem source-to-sink sugar transport

Sugars moving from a mature source leaf through phloem toward both an upper growing shoot and a lower storage root

Type `PLANT_PHLOEM_SOURCE_TO_SINK_TRANSPORT` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-9a2cd7c5afe7.js`; view `visualization-3b087a3a6f45.js` → `Visualization`.

#### Phosphate functional-group structure and negative charge

Type `BIOLOGICAL_PHOSPHATE_FUNCTIONAL_GROUP_CHARGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e70e31610f3c.js`; view `visualization-beb7b85ff1a9.js` → `Visualization`.

#### Phospholipid bilayer self-assembly

Type `PHOSPHOLIPID_BILAYER_SELF_ASSEMBLY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-dd0c1b24d29b.js`; view `visualization-bc152ea751bb.js` → `PhospholipidBilayerSelfAssemblyVisualization`.

#### Phospholipid structure and polarity

Type `PHOSPHOLIPID_STRUCTURE_POLARITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f39f27209112.js`; view `visualization-c3de98845482.js` → `PhospholipidStructurePolarityVisualization`.

#### Phosphorus from rock to the food web

How does phosphate leave rock, enter living organisms, and return to the soil? Explain how weathering releases phosphate into soil, producers assimilate it, consumers obtain it through feeding, and decomposition returns phosphate for reuse.

Type `BIOGEOCHEMICAL_PHOSPHORUS_ROCK_TO_FOOD_WEB` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4b9d5cc2789d.js`; view `visualization-1565fa34e606.js` → `Visualization`.

#### Phosphorus has no major atmospheric reservoir

Why does the phosphorus cycle differ from the carbon and nitrogen cycles? Distinguish phosphorus's mainly geological, aquatic, and biological reservoirs from the major atmospheric gas reservoirs of carbon and nitrogen.

Type `BIOGEOCHEMICAL_PHOSPHORUS_NO_ATMOSPHERIC_RESERVOIR` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-22a22f45a358.js`; view `visualization-a0edaf2b6a02.js` → `Visualization`.

#### Phosphorus sedimentation and uplift

How does phosphorus return from aquatic sediment to land over geological time? Explain why sediment burial, rock formation, and geological uplift close the phosphorus cycle much more slowly than biological recycling.

Type `BIOGEOCHEMICAL_PHOSPHORUS_SEDIMENTATION_AND_UPLIFT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b55fe341963b.js`; view `visualization-2894ccdacd58.js` → `Visualization`.

#### Photosynthesis and respiration carbon exchange

How does one carbon atom move from atmospheric carbon dioxide into a food web and back into the air? Trace the same carbon from atmospheric carbon dioxide into producer and consumer biomass and back to the atmosphere through respiration.

Type `BIOGEOCHEMICAL_CARBON_PHOTOSYNTHESIS_RESPIRATION_EXCHANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-601faaaa2b3f.js`; view `visualization-e5523a5f5950.js` → `Visualization`.

#### Photosynthesis Calvin-cycle carbon accounting

Type `PHOTOSYNTHESIS_CALVIN_CYCLE_CARBON_ACCOUNTING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4b69eb2051a2.js`; view `visualization-8c176d8db9c8.js` → `Visualization`.

#### Photosynthesis chemiosmosis and ATP production

Type `PHOTOSYNTHESIS_CHEMIOSMOSIS_ATP_PRODUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d944714824d1.js`; view `visualization-eefed0ea6c5c.js` → `Visualization`.

#### Photosynthesis chloroplast organization

Type `PHOTOSYNTHESIS_CHLOROPLAST_ORGANIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5813e9552d88.js`; view `visualization-9c61833887a5.js` → `Visualization`.

#### Photosynthesis light and carbon-dioxide limitation

Type `PHOTOSYNTHESIS_LIGHT_CARBON_DIOXIDE_LIMITATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7439b956bf95.js`; view `visualization-ae47ed8a9dde.js` → `Visualization`.

#### Photosynthesis light reaction and Calvin-cycle coupling

Type `PHOTOSYNTHESIS_LIGHT_CALVIN_STAGE_COUPLING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b4093a0b5b43.js`; view `visualization-68f1a9fc87ef.js` → `Visualization`.

#### Photosynthesis matter and energy inputs and outputs

Type `PHOTOSYNTHESIS_MATTER_ENERGY_INPUTS_OUTPUTS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3ea07158b348.js`; view `visualization-74c6564755c1.js` → `Visualization`.

#### Photosynthesis stomatal water and carbon tradeoff

Type `PHOTOSYNTHESIS_STOMATAL_WATER_CARBON_TRADEOFF` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1e708a76dbab.js`; view `visualization-d1fba30ec74c.js` → `Visualization`.

#### Photosynthesis thylakoid proton gradient

Type `PHOTOSYNTHESIS_THYLAKOID_PROTON_GRADIENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-38c90aa02cfd.js`; view `visualization-f3987ea72c48.js` → `Visualization`.

#### Photosynthesis water splitting and oxygen release

Type `PHOTOSYNTHESIS_WATER_SPLITTING_OXYGEN_RELEASE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a6a40f3e6ad7.js`; view `visualization-9ecd77afa3c0.js` → `Visualization`.

#### Photosynthesis: water to NADPH through PSII, ETC, and PSI

Type `PHOTOSYNTHESIS_LIGHT_REACTION_ELECTRON_TRANSPORT` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-3d6c55d30edf.js`; view `visualization-901074c30ef3.js` → `Visualization`.

#### Photosynthetic producers and consuming organisms

Type `LIFE_PHOTOSYNTHETIC_VERSUS_CONSUMING_ORGANISMS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-957f4059bcf0.js`; view `visualization-89222c43fe24.js` → `Visualization`.

#### Phototropism auxin redistribution

Type `PHOTOTROPISM_AUXIN_REDISTRIBUTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-730ccc93b238.js`; view `visualization-54ff7cf6b9a3.js` → `Visualization`.

#### Phylogenetic branch rotation invariance

Type `PHYLOGENETIC_TREE_ROTATION_INVARIANCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3450bd7547c0.js`; view `visualization-f8debe429187.js` → `Visualization`.

#### Phylogeny and common ancestry overview

Type `PHYLOGENY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2b8c3230c712.js`; view `visualization-e55241ac2e0a.js` → `Visualization`.

#### Phytochrome night interruption

Type `PHYTOCHROME_NIGHT_INTERRUPTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6d2ee197824e.js`; view `visualization-1a97ba585118.js` → `Visualization`.

#### Placental maternal-fetal exchange

Placental maternal-fetal exchange: Maternal and fetal circulations remain physically separate at the placenta; oxygen and nutrients cross toward fetal blood, while fetal carbon dioxide and other wastes cross in the opposite direction toward maternal blood.

Type `ANIMAL_PLACENTAL_MATERNAL_FETAL_EXCHANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1b121da66991.js`; view `visualization-1a240b2200a9.js` → `AnimalPlacentalMaternalFetalExchangeVisualization`.

#### Plant cell structure and function

Type `PLANT_CELL_STRUCTURE_AND_FUNCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3112f6a513b6.js`; view `visualization-852d638fd72d.js` → `Visualization`.

#### Plant cell wall and animal extracellular-matrix overview

Plant cell supported by an exterior cellulose wall and animal cell attached to an exterior extracellular matrix; both have a plasma membrane.

Type `CELLULAR_ENVIRONMENT_INTERACTIONS_OVERVIEW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c20397973282.js`; view `visualization-845e9878b386.js` → `Visualization`.

#### Plant cell wall, membrane, and vacuole

Type `PLANT_CELL_WALL_MEMBRANE_AND_VACUOLE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9ed00bb79a1b.js`; view `visualization-d58f0aca9663.js` → `Visualization`.

#### Plant diversity and life cycles

Compare four major living land-plant groups by their recognizable body forms and their spore-based or seed-based reproduction.

Type `PLANT_DIVERSITY_AND_LIFE_CYCLES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5a4bba801ffe.js`; view `visualization-94b95c1269cc.js` → `PlantDiversityAndLifeCyclesVisualization`.

#### Plant evolution: vascular tissue, seeds, and flowers

Place vascular tissue, seeds, and flowers at successive shared-ancestry branch points without portraying living lineages as a linear ladder.

Type `PLANT_EVOLUTION_VASCULAR_TISSUE_SEEDS_AND_FLOWERS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c08e9adeca21.js`; view `visualization-58f36988580f.js` → `PlantEvolutionVascularTissueSeedsAndFlowersVisualization`.

#### Plant photosynthesis inputs are sunlight, carbon dioxide, and water

A whole plant uses sunlight, carbon dioxide, and water to make sugar and release oxygen.

Type `PHOTOSYNTHESIS_INPUTS_SUGAR_OXYGEN_OVERVIEW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-31d40876948d.js`; view `visualization-12b3a6de53ed.js` → `Visualization`.

#### Plant respiration continues as daytime photosynthesis gives way to night

A plant takes in carbon dioxide and releases oxygen in daylight, then takes in oxygen and releases carbon dioxide at night while respiration continues throughout.

Type `PLANT_PHOTOSYNTHESIS_AND_RESPIRATION_DAY_NIGHT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c60f2e059d80.js`; view `visualization-93c67a1c51f9.js` → `Visualization`.

#### Plant root and shoot system interdependence

Type `PLANT_ROOT_SHOOT_SYSTEM_INTERDEPENDENCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-34882bf4bb7d.js`; view `visualization-43279e4fb731.js` → `Visualization`.

#### Plant root-water uptake and leaf transpiration

How does soil water move through plants back into the atmosphere? Trace one conserved water marker from soil pore water through plant roots and leaves into the atmospheric reservoir by transpiration.

Type `BIOGEOCHEMICAL_WATER_PLANT_UPTAKE_AND_TRANSPIRATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ca8bf97e182d.js`; view `visualization-83be6c08e8e3.js` → `Visualization`.

#### Plant spores versus seeds

Compare a haploid single-celled spore with a seed containing a multicellular embryo, protective coat, and stored food.

Type `PLANT_SPORES_VERSUS_SEEDS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-11635086c77a.js`; view `visualization-b7e63896029e.js` → `PlantSporesVersusSeedsVisualization`.

#### Plant statolith gravity sensing

Type `PLANT_STATOLITH_GRAVITY_SENSING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-87082793c117.js`; view `visualization-9eb772c35a0a.js` → `Visualization`.

#### Plant-cell turgidity, flaccidity, and plasmolysis across three tonicities

Type `PLANT_CELL_TONICITY_COMPARISON` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-473636c1b4a2.js`; view `visualization-c17be0ce263b.js` → `Visualization`.

#### Plant-made sugar moves into root storage and supports new growth

Sugar made in a plant leaf moves down the stem into root storage and helps the plant grow new tissue.

Type `PLANT_SUGAR_STORAGE_AND_GROWTH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1bb10f568067.js`; view `visualization-4903413d50ba.js` → `Visualization`.

#### Plant, fungal, and animal cell structures

Type `LIFE_PLANT_ANIMAL_FUNGAL_CELL_STRUCTURES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-43d87d417522.js`; view `visualization-d2af52488262.js` → `Visualization`.

#### Plants and animals exchange matter while energy enters and leaves

A whole plant and animal exchange food, oxygen, carbon dioxide, and water while sunlight enters and heat leaves.

Type `MATTER_AND_ENERGY_IN_WHOLE_ORGANISMS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9346786336cc.js`; view `visualization-5cabb4a95696.js` → `Visualization`.

#### Plasma membrane as a cell boundary

Type `PLASMA_MEMBRANE_CELL_BOUNDARY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f17429136507.js`; view `visualization-6c5648b661a9.js` → `Visualization`.

#### Plasma membrane fluid-mosaic architecture

Type `PLASMA_MEMBRANE_FLUID_MOSAIC_ARCHITECTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d88acbd7550a.js`; view `visualization-660155290436.js` → `Visualization`.

#### Plasmid sticky-end ligation

An open circular plasmid and donor DNA each expose complementary sticky ends; both donor ends align, ligase seals two junctions, and the closed recombinant plasmid retains a conspicuous donor insert.

Type `PLASMID_STICKY_END_LIGATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-1d40c81439ff.js`; view `visualization-c52e7aab6a2c.js` → `Visualization`.

#### Platelet recruitment amplifies until the same vessel wound is sealed

A first platelet adheres to an open blood-vessel wound, recruits additional individually tracked platelets, and forms a plug that seals the opening and stops further recruitment.

Type `POSITIVE_FEEDBACK_BLOOD_CLOTTING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b02b2dfd921a.js`; view `visualization-896b5dd523f2.js` → `PositiveFeedbackBloodClottingVisualization`.

#### Pollen fertilization without standing water

Follow pollen landing on a recognizable flower, internal pollen-tube sperm transport to a protected haploid egg, and formation of a visible diploid zygote without an external water film.

Type `PLANT_POLLEN_FERTILIZATION_WITHOUT_STANDING_WATER` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-a7661cf22b89.js`; view `visualization-eca6d6429466.js` → `PlantPollenFertilizationWithoutStandingWaterVisualization`.

#### Pollen transfer during pollination

A bee carrying one continuous pollen grain from the anther of one flower to the receptive stigma of another flower

Type `PLANT_POLLINATION_POLLEN_TRANSFER` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-66f677011260.js`; view `visualization-548bb92ee6d2.js` → `Visualization`.

#### Pollen-tube growth and fertilization

Pollen already on a stigma grows a tube through the style, delivers a male gamete into an ovule, and ends with a visibly fertilized ovule inside the ovary

Type `PLANT_POLLEN_TUBE_FERTILIZATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-1ef887f46e6e.js`; view `visualization-ce1b29b06f4f.js` → `Visualization`.

#### Pollination, fertilization, and seed formation

Flowering-plant reproduction: a bee transfers pollen to a flower, reproductive material reaches an ovule, and fertilization leads to a new seed.

Type `ORGANISM_POLLINATION_FERTILIZATION_AND_SEEDS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-456f40972751.js`; view `visualization-d0471d718707.js` → `OrganismPollinationFertilizationAndSeedsVisualization`.

#### Population adaptation across generations

Type `POPULATION_ADAPTATION_ACROSS_GENERATIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e363e27a2e77.js`; view `visualization-dc075b5e1b1a.js` → `PopulationAdaptationAcrossGenerationsVisualization`.

#### Population bottleneck and persistent variation loss

Type `POPULATION_GENETICS_BOTTLENECK_EFFECT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d3c203a3615d.js`; view `visualization-5eaea6a50254.js` → `Visualization`.

#### Population ecology and environmental limits

Type `POPULATION_ECOLOGY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-33388a0d2369.js`; view `visualization-89335f5098de.js` → `Visualization`.

#### Population genetics and evolutionary mechanisms

Type `POPULATION_GENETICS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f47a75a6fa96.js`; view `visualization-265ddb70e403.js` → `Visualization`.

#### Population size and genetic-drift magnitude

Type `POPULATION_GENETICS_POPULATION_SIZE_AND_DRIFT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9c814862b668.js`; view `visualization-afb17c1fe4e0.js` → `Visualization`.

#### Posterior pituitary neurohormone release

Type `POSTERIOR_PITUITARY_NEUROHORMONE_RELEASE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2294a8d7b5d0.js`; view `visualization-eae63f3e11a0.js` → `Visualization`.

#### Postsynaptic potential summation

Excitatory and inhibitory inputs converge on one neuron. Inhibition first keeps the net voltage below threshold; additional excitation reaches threshold and triggers an axonal action potential.

Type `POSTSYNAPTIC_POTENTIAL_SUMMATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ec07fcfd2e5c.js`; view `visualization-a418271fa310.js` → `PostsynapticPotentialSummationVisualization`.

#### PP and Pp are purple while only pp expresses the white recessive phenotype

Type `MENDELIAN_GENOTYPE_PHENOTYPE_DOMINANCE` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-d879e1d7aee6.js`; view `visualization-632179b54e6b.js` → `Visualization`.

#### PP, Pp, and pp parental genotypes predict distinct one-allele gametes

Type `MENDELIAN_GAMETE_FORMATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-417542ada9fc.js`; view `visualization-d158b68eea68.js` → `Visualization`.

#### Pre-existing genetic variation and environmental disturbance

Type `BIODIVERSITY_GENETIC_VARIATION_ENVIRONMENTAL_CHANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e170c982f551.js`; view `visualization-f0ab366a2d9b.js` → `Visualization`.

#### Pre-mRNA exon and intron structure

Type `PRE_MRNA_EXON_INTRON_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-56a4ca180bc0.js`; view `visualization-d9d1fe3037f7.js` → `Visualization`.

#### Pre-mRNA intron splicing

Type `PRE_MRNA_INTRON_SPLICING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-431599afd2c5.js`; view `visualization-aeb31c02d9bf.js` → `Visualization`.

#### Pre-mRNA processing

Type `PRE_MRNA_PROCESSING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-49cdf9fb2e2a.js`; view `visualization-9f63153b6f51.js` → `Visualization`.

#### Prebiotic organic-molecule synthesis

Type `PREBIOTIC_ORGANIC_MOLECULE_SYNTHESIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ad9c84116c3e.js`; view `visualization-79d9cb7aa277.js` → `Visualization`.

#### Predation energy and population effects

Type `PREDATION_ENERGY_AND_POPULATION_EFFECTS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9a0afcf611ce.js`; view `visualization-c4120f99370d.js` → `PredationEnergyAndPopulationEffectsVisualization`.

#### Predator reintroduction trophic recovery

Type `PREDATOR_REINTRODUCTION_TROPHIC_RECOVERY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-38f3976a9f65.js`; view `visualization-150d031adee1.js` → `PredatorReintroductionTrophicRecoveryVisualization`.

#### Predator removal trophic cascade

Type `PREDATOR_REMOVAL_TROPHIC_CASCADE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c87ab31932ad.js`; view `visualization-826045b565c8.js` → `PredatorRemovalTrophicCascadeVisualization`.

#### Prepare a wet-mount microscope slide

Type `MICROSCOPY_WET_MOUNT_SLIDE_PREPARATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9ee7adca7cb4.js`; view `visualization-1edd969910cf.js` → `Visualization`.

#### Primary amino-acid sequence determines protein fold

Type `PROTEIN_PRIMARY_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-db2739ae4e9e.js`; view `visualization-6438a3912264.js` → `ProteinPrimaryStructureVisualization`.

#### Primary and secondary immune response

Why is a second response to the same antigen faster and larger? Interpret the standard antibody-versus-time curves to explain why antigen-specific immune memory yields a faster and greater response upon re-exposure to the same antigen.

Type `IMMUNE_MEMORY_SECONDARY_RESPONSE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-525fa85740da.js`; view `visualization-95887b164fcd.js` → `ImmuneMemorySecondaryResponseVisualization`.

#### Primary sensory cilium compared with multiple motile cilia

Distinguish a typical nonmotile 9+0 primary sensory cilium from 9+2 motile cilia by their axonemal structure, dynein arms, abundance, and cellular function.

Type `PRIMARY_VERSUS_MOTILE_CILIA` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-22e1b8e54a6d.js`; view `visualization-181caf0f2526.js` → `Visualization`.

#### Primary succession community assembly

Type `PRIMARY_SUCCESSION_COMMUNITY_ASSEMBLY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b1c99b0e9519.js`; view `visualization-22944dd54e75.js` → `PrimarySuccessionCommunityAssemblyVisualization`.

#### Producer to consumer energy transfer

Type `PRODUCER_TO_CONSUMER_ENERGY_TRANSFER` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-bc6a88a45b34.js`; view `visualization-764f47e16c14.js` → `Visualization`.

#### Programmed interdigital cell death separates a recognizable developing hand

Developmental apoptosis and digit separation: one recognizable developing hand begins with webbed fingers, selected cells between its digits undergo orderly programmed removal, and the same separated fingers and connected living palm remain.

Type `DEVELOPMENTAL_APOPTOSIS_AND_DIGIT_SEPARATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5708de5d2d55.js`; view `visualization-dfc0ed1a8f48.js` → `Visualization`.

#### Prokaryotic cell organization

Type `PROKARYOTIC_CELL_ORGANIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-87edb06effd5.js`; view `visualization-4aa06a9824a5.js` → `Visualization`.

#### Promoter and RNA polymerase initiation

Type `PROMOTER_RNA_POLYMERASE_INITIATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7240b8a55edc.js`; view `visualization-b4b658d9b5ce.js` → `Visualization`.

#### Promoter-associated DNA methylation accumulates on an unchanged DNA sequence, reduces transcriptional access, and silences mRNA production.

Type `DNA_METHYLATION_TRANSCRIPTIONAL_SILENCING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-681a2655f19a.js`; view `visualization-fdc54cbc852c.js` → `Visualization`.

#### Prophase, metaphase, anaphase, and telophase comparison

Type `MITOSIS_PHASE_SEQUENCE_OVERVIEW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-bcf4f215a71f.js`; view `visualization-c5185049009c.js` → `Visualization`.

#### Proteins: four levels of structure and functional shape

Type `PROTEINS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-256a9cb0a0be.js`; view `visualization-5b8b179dc00a.js` → `ProteinsVisualization`.

#### Protist binary fission

Type `PROTIST_BINARY_FISSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3c3b810eebf1.js`; view `visualization-9fc5a5697b7c.js` → `Visualization`.

#### Protist diversity and nutrition

Type `PROTIST_DIVERSITY_AND_NUTRITION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-bd028d9729f9.js`; view `visualization-3dd27670b06a.js` → `Visualization`.

#### Protist locomotion mechanisms

Type `PROTIST_LOCOMOTION_MECHANISMS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6748a0cc812e.js`; view `visualization-47707b4e889f.js` → `Visualization`.

#### Protocell membrane self-assembly

Type `PROTOCELL_MEMBRANE_SELF_ASSEMBLY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-65e5956bead2.js`; view `visualization-1d69af3d6f0e.js` → `Visualization`.

#### Protostome versus deuterostome development

Type `ANIMAL_PROTOSTOME_VERSUS_DEUTEROSTOME_DEVELOPMENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-36f42c0631b0.js`; view `visualization-66e31497b460.js` → `AnimalProtostomeVersusDeuterostomeDevelopmentVisualization`.

#### Pyruvate oxidation carbon transfer

Type `PYRUVATE_OXIDATION_CARBON_TRANSFER` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-22451dfcee89.js`; view `visualization-26b30ab5fb08.js` → `PyruvateOxidationCarbonTransferVisualization`.

#### Quaternary protein subunit assembly

Type `PROTEIN_QUATERNARY_ASSEMBLY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c3c73ddc9a67.js`; view `visualization-335db458d101.js` → `ProteinQuaternaryAssemblyVisualization`.

#### Radial versus bilateral animal symmetry

Type `ANIMAL_RADIAL_VERSUS_BILATERAL_SYMMETRY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b96e0196f8fc.js`; view `visualization-ad22ef8a6c51.js` → `AnimalRadialVersusBilateralSymmetryVisualization`.

#### Random biological sampling and selection bias

Type `BIOLOGICAL_RANDOM_SAMPLING_AND_SELECTION_BIAS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3ffcf202f4bc.js`; view `visualization-f015d470cbf7.js` → `BiologicalRandomSamplingAndSelectionBiasVisualization`.

#### Random genetic drift through chance sampling

Type `POPULATION_GENETICS_RANDOM_GENETIC_DRIFT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-da43ebb83605.js`; view `visualization-31326e09df83.js` → `Visualization`.

#### Reception, intracellular transduction, and response in one target cell

Signal-transduction architecture: an extracellular ligand binds a membrane receptor during reception, intracellular relay proteins carry the signal during transduction, and an activated target produces the cellular response.

Type `SIGNAL_TRANSDUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7d3e23e63010.js`; view `visualization-94bf2cd3348d.js` → `Visualization`.

#### Reciprocal crossover preserves parental and recombinant chromatid products

Type `LINKED_GENE_RECOMBINATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e21ff116a578.js`; view `visualization-32a1929bf700.js` → `LinkedGeneRecombinationVisualization`.

#### Recognizable blood, nerve, and muscle cells perform complementary jobs

Type `SPECIALIZED_CELLS_AND_DIVISION_OF_LABOR` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-23270fc37604.js`; view `visualization-73aa0dc485ca.js` → `Visualization`.

#### Recognizable DNA and RNA polymerases make two DNA duplexes or one RNA strand from the same DNA

Type `DNA_REPLICATION_VERSUS_TRANSCRIPTION_PRODUCTS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ec4662dd36a9.js`; view `visualization-1154485aa244.js` → `DnaReplicationVersusTranscriptionProductsVisualization`.

#### Recognizable fish single circulation versus mammalian double circulation

Recognizable fish and mammal circulation comparison: the fish's exposed gills and heart form a single heart-to-gills-to-body circuit with one heart passage, while the mammal's lungs and divided heart form connected pulmonary and systemic circuits with two heart passages.

Type `ANIMAL_SINGLE_VERSUS_DOUBLE_CIRCULATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-5166bb8452fd.js`; view `visualization-a5fa53e82c4f.js` → `AnimalSingleVersusDoubleCirculationVisualization`.

#### Recognizable pea pollen and ovule fuse into a Pp zygote before a subordinate purple-flower phenotype appears

Type `MENDELIAN_RANDOM_FERTILIZATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-b9a71ab31d05.js`; view `visualization-567e6d2ced9a.js` → `Visualization`.

#### Recombinant DNA plasmid workflow

One conspicuous donor gene joins an initially empty circular plasmid; the same thick donor arc stays visible on the recombinant ring and on that same recombinant plasmid inside a recognizable bacterial host.

Type `RECOMBINANT_DNA_PLASMID_WORKFLOW` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-eb58d40a2be5.js`; view `visualization-b96c1b516737.js` → `Visualization`.

#### Reductional meiosis I separates homologs while equational meiosis II separates sisters

Type `MEIOSIS_ONE_VERSUS_MEIOSIS_TWO` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-eab69d4e0986.js`; view `visualization-ec05f96da128.js` → `Visualization`.

#### Reflex-arc neural-circuit wiring

A hand supplies afferent sensory input to the spinal cord, a central interneuron relays the signal, and an efferent motor neuron activates a skeletal-muscle effector.

Type `REFLEX_ARC_NEURAL_CIRCUIT_WIRING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-884bf18a6de5.js`; view `visualization-94357630445d.js` → `ReflexArcNeuralCircuitWiringVisualization`.

#### Relative versus radiometric fossil dating

Type `RELATIVE_VERSUS_RADIOMETRIC_FOSSIL_DATING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5dac37ab176d.js`; view `visualization-f4ccb00206c2.js` → `RelativeVersusRadiometricFossilDatingVisualization`.

#### Repairable DNA damage permits survival while irreparable damage triggers apoptosis

Type `DNA_DAMAGE_REPAIR_VERSUS_APOPTOSIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2d9552d87b54.js`; view `visualization-80c527972741.js` → `Visualization`.

#### Replication-fork architecture

Type `DNA_REPLICATION_FORK_ARCHITECTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-84a825f34b15.js`; view `visualization-338444497704.js` → `DnaReplicationForkArchitectureVisualization`.

#### Representative bacterial, animal, and plant cells on a logarithmic scale

Representative bacterial, animal, and plant cells align with equally spaced logarithmic scale marks at 1, 10, and 100 micrometers; each step represents a tenfold increase.

Type `CELL_THEORY_CELL_SIZE_SCALE_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4918d12b14e8.js`; view `visualization-cff11a5364fb.js` → `Visualization`.

#### Resource partitioning habitat zones

Type `RESOURCE_PARTITIONING_HABITAT_ZONES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-719c392ffb20.js`; view `visualization-3f8edc134924.js` → `ResourcePartitioningHabitatZonesVisualization`.

#### Restriction digest gel band patterns

One linear DNA molecule contains two marked restriction sites; its uncut lane retains one high band, while a digested lane contains three size-ordered bands beside a DNA ladder.

Type `RESTRICTION_DIGEST_GEL_BAND_PATTERNS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-40644034cec7.js`; view `visualization-41beb83a0078.js` → `Visualization`.

#### Restriction enzyme recognition sites

Two double-stranded DNA sequences compare the canonical EcoRI recognition palindrome GAATTC/CTTAAG with a one-base nonmatching sequence; offset cut marks identify the matching site's staggered cleavage positions.

Type `RESTRICTION_ENZYME_RECOGNITION_SITES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-65a92b70efc5.js`; view `visualization-4589c4cf73c1.js` → `Visualization`.

#### Restriction enzyme sticky-end cleavage

One intact DNA duplex recruits a recognizable restriction endonuclease to its marked recognition sequence, acquires staggered cuts, and separates into two products with conspicuous complementary sticky ends.

Type `RESTRICTION_ENZYME_STICKY_END_CLEAVAGE` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-8d101a5ae687.js`; view `visualization-499bb92e5f7a.js` → `Visualization`.

#### Retinal phototransduction and hyperpolarization

Type `SENSORY_RETINAL_PHOTOTRANSDUCTION_HYPERPOLARIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-32d2e210b282.js`; view `visualization-fc1fff31bd0e.js` → `Visualization`.

#### Reversible macromolecule dehydration synthesis and hydrolysis

Type `MACROMOLECULE_DEHYDRATION_HYDROLYSIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3944760eb043.js`; view `visualization-c67e7f4dd279.js` → `Visualization`.

#### Ribosome E exit, P peptidyl, and A aminoacyl sites

Type `RIBOSOME_A_P_E_SITES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4afe8158dd2f.js`; view `visualization-35050aaaa4d1.js` → `RibosomeAPESitesVisualization`.

#### RNA polymerase reads a DNA template and extends RNA five to three prime

Type `RNA_POLYMERASE_TEMPLATE_DIRECTED_SYNTHESIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9a2714f81251.js`; view `visualization-33056fd6693f.js` → `RnaPolymeraseTemplateDirectedSynthesisVisualization`.

#### RNA polymerase template-strand reading

Type `RNA_POLYMERASE_TEMPLATE_STRAND_READING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cf97b8333197.js`; view `visualization-2cb653cee9df.js` → `Visualization`.

#### RNA primer initiates DNA synthesis

Type `DNA_REPLICATION_RNA_PRIMER_INITIATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ba1da8d050b8.js`; view `visualization-95e0e9fddc9a.js` → `DnaReplicationRnaPrimerInitiationVisualization`.

#### RNA template-directed replication

Type `RNA_TEMPLATE_DIRECTED_REPLICATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-218e81c32abc.js`; view `visualization-c9c1ef9a39e1.js` → `Visualization`.

#### RNA-world information and catalysis

Type `RNA_WORLD_INFORMATION_AND_CATALYSIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-49cb1621f5ba.js`; view `visualization-19ae2cf16526.js` → `Visualization`.

#### Rod and cone visual sensitivity

Type `SENSORY_VISUAL_RODS_CONES_LIGHT_SENSITIVITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6afae062f026.js`; view `visualization-129647d67bf2.js` → `Visualization`.

#### Root cross-section tissue systems

Flowering-plant root cross section showing root hairs and epidermis around the cortex, an endodermis surrounding central xylem, and phloem between the xylem arms

Type `PLANT_ROOT_CROSS_SECTION_TISSUE_SYSTEMS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1b82a77caf7f.js`; view `visualization-a538a8291d39.js` → `Visualization`.

#### Root gravitropism auxin reorientation

Type `ROOT_GRAVITROPISM_AUXIN_REORIENTATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-feeae5b7bea7.js`; view `visualization-153efaf3ec69.js` → `Visualization`.

#### Root hydrotropism and moisture gradients

Type `ROOT_HYDROTROPISM_MOISTURE_GRADIENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ae71bdeade15.js`; view `visualization-9ee024fd160e.js` → `Visualization`.

#### Root-hair mineral-ion uptake

Magnified root hair using an ATP-powered membrane pump to move a dissolved mineral ion from lower concentration in soil into higher concentration inside the root cell

Type `PLANT_ROOT_HAIR_MINERAL_ION_UPTAKE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cda463d5cfd9.js`; view `visualization-312019d7f935.js` → `Visualization`.

#### Root-hair water absorption

Magnified root hair absorbing water from soil and carrying that same water through root tissue into xylem

Type `PLANT_ROOT_HAIR_WATER_ABSORPTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-118f50b240ca.js`; view `visualization-83241dce066d.js` → `Visualization`.

#### Rooted phylogenetic tree anatomy

Type `ROOTED_PHYLOGENETIC_TREE_ANATOMY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b5cb286d2ce2.js`; view `visualization-2bd22ada3273.js` → `Visualization`.

#### Rough versus smooth endoplasmic reticulum

Type `ROUGH_VERSUS_SMOOTH_ENDOPLASMIC_RETICULUM` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-12cccf874cb5.js`; view `visualization-6266399768c1.js` → `Visualization`.

#### Saturating biological dose-response relationship

Type `BIOLOGICAL_DOSE_RESPONSE_AND_SATURATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a29ff7456296.js`; view `visualization-7ad53e4743c4.js` → `BiologicalDoseResponseAndSaturationVisualization`.

#### Seasonal food scarcity induces hibernation and reduced metabolism

Type `HIBERNATION_SEASONAL_ENERGY_CONSERVATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f30ca30c2a6d.js`; view `visualization-be26295c5940.js` → `HibernationSeasonalEnergyConservationVisualization`.

#### Secondary active cotransport

Type `SECONDARY_ACTIVE_COTRANSPORT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-fdaa35f99070.js`; view `visualization-46495e2e12cc.js` → `Visualization`.

#### Secondary succession ecosystem recovery

Type `SECONDARY_SUCCESSION_ECOSYSTEM_RECOVERY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-58e653f36fa9.js`; view `visualization-f6d2abb55166.js` → `SecondarySuccessionEcosystemRecoveryVisualization`.

#### Seed dispersal adaptations: wings and hooks

A parent flowering plant beside a winged seed carried in the direction of wind and a different hooked seed caught in animal fur, comparing two seed-dispersal adaptations

Type `PLANT_SEED_DISPERSAL_ADAPTATIONS` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-b6c0eab2709a.js`; view `visualization-9466a03c1848.js` → `Visualization`.

#### Seed dispersal and the next generation

Seed dispersal: one seed leaves a mature parent plant, moves to a different location, and grows into a separate next-generation seedling.

Type `ORGANISM_SEED_DISPERSAL_AND_NEXT_GENERATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-558840ae4c86.js`; view `visualization-b0d45c1e5a6e.js` → `OrganismSeedDispersalAndNextGenerationVisualization`.

#### Seed germination and seedling growth

Seed germination: water activates a living seed, the root grows downward first, the shoot grows upward, and a rooted seedling develops leaves.

Type `ORGANISM_SEED_GERMINATION_AND_SEEDLING_GROWTH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-328a29e06d5b.js`; view `visualization-a81d19443642.js` → `OrganismSeedGerminationAndSeedlingGrowthVisualization`.

#### Seed germination: root before shoot

One living seed taking up water, sending a radicle root downward first, then growing an upward shoot and first leaves

Type `PLANT_SEED_GERMINATION_ROOT_BEFORE_SHOOT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-cf3233c2081b.js`; view `visualization-44a06c3ad8c1.js` → `Visualization`.

#### Selective channel and carrier proteins

Type `MEMBRANE_CHANNEL_CARRIER_SPECIFICITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a215e928bcb4.js`; view `visualization-df0c4f98853a.js` → `Visualization`.

#### Selective permeability of the plasma membrane

Type `MEMBRANE_SELECTIVE_PERMEABILITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1ee3bc06b9f4.js`; view `visualization-904143867731.js` → `Visualization`.

#### Semiconservative DNA replication

Type `DNA_REPLICATION_SEMICONSERVATIVE_INHERITANCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-865ce1221646.js`; view `visualization-aa12b2b4ba12.js` → `DnaReplicationSemiconservativeInheritanceVisualization`.

#### Sensory adaptation in phasic and tonic receptors

Type `SENSORY_ADAPTATION_PHASIC_TONIC_RECEPTORS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d74c69b35ab6.js`; view `visualization-f6a26a095ea5.js` → `Visualization`.

#### Sensory population recruitment and stimulus intensity

Type `SENSORY_POPULATION_RECRUITMENT_INTENSITY_CODING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-44bde8bcd42d.js`; view `visualization-9a97bf6d0cb2.js` → `Visualization`.

#### Sensory receptor potential and firing threshold

Type `SENSORY_RECEPTOR_POTENTIAL_THRESHOLD` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-66bccf0a3d32.js`; view `visualization-6ded3e0f6775.js` → `Visualization`.

#### Sensory stimulus intensity frequency coding

Type `SENSORY_STIMULUS_INTENSITY_FREQUENCY_CODING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c00f95c080db.js`; view `visualization-91ff3932ed80.js` → `Visualization`.

#### Separate meiotic cells compare two equally likely independent-assortment orientations

Type `METAPHASE_ONE_INDEPENDENT_ASSORTMENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e36233912456.js`; view `visualization-cbab97ce713d.js` → `Visualization`.

#### Sequential colonization of land by life

Type `SEQUENTIAL_COLONIZATION_OF_LAND_BY_LIFE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-61c57c98ee7f.js`; view `visualization-81987e7d3f6a.js` → `SequentialColonizationOfLandByLifeVisualization`.

#### Sexual versus asexual animal reproduction

Sexual versus asexual animal reproduction: Some animals such as hydra reproduce asexually by budding from one parent, whereas sexual reproduction forms a zygote through the fusion of two gametes carrying distinguishable parental contributions.

Type `ANIMAL_SEXUAL_VERSUS_ASEXUAL_REPRODUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7a5959e73df1.js`; view `visualization-fc32fb4b4374.js` → `AnimalSexualVersusAsexualReproductionVisualization`.

#### Shade avoidance red/far-red signaling

Type `SHADE_AVOIDANCE_RED_FAR_RED_SIGNALING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-41099eb227b7.js`; view `visualization-afe10cf44be8.js` → `Visualization`.

#### Shape-dependent protein function is lost during denaturation

Type `PROTEIN_DENATURATION_UNFOLDING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-531ada35ff78.js`; view `visualization-d761a88dafcb.js` → `ProteinDenaturationUnfoldingVisualization`.

#### Shared derived character inheritance

Type `SHARED_DERIVED_CHARACTER_INHERITANCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e04eaf16d16a.js`; view `visualization-37e956272c5f.js` → `Visualization`.

#### Shared derived characters define nested clades

Type `SHARED_DERIVED_CHARACTER_CLADE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9577d13255f9.js`; view `visualization-82d650dd1040.js` → `Visualization`.

#### Shared signal transduction can alter a cytoplasmic enzyme or nuclear gene expression

Cellular response comparison: one membrane receptor and shared intracellular relay branch toward a cytoplasmic enzyme-activity response or a nucleus-associated gene-expression response.

Type `SIGNAL_RESPONSE_GENE_EXPRESSION_VERSUS_ENZYME_ACTIVATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e3a99bb3880b.js`; view `visualization-e8d8c59fa5e0.js` → `Visualization`.

#### Short-wavelength excitation causes longer-wavelength fluorescence

Type `MICROSCOPY_FLUORESCENCE_EXCITATION_EMISSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-daa2567423cb.js`; view `visualization-a728da676bb5.js` → `Visualization`.

#### Sigmoidal hemoglobin oxygen saturation at tissues and lungs

Hemoglobin oxygen dissociation curve: oxygen availability increases along the horizontal axis and hemoglobin saturation rises sigmoidally; the lower-oxygen tissue region is steep and supports unloading, while the high-oxygen lung region forms a high-saturation loading plateau.

Type `ANIMAL_HEMOGLOBIN_OXYGEN_DISSOCIATION_CURVE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6de633b923d6.js`; view `visualization-5a9cf12fb3d9.js` → `AnimalHemoglobinOxygenDissociationCurveVisualization`.

#### Silent missense and nonsense outcomes

Type `MUTATION_SUBSTITUTION_OUTCOMES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a914b2788b8b.js`; view `visualization-b0d28aad245c.js` → `Visualization`.

#### Silent synonymous substitution

Type `MUTATION_SILENT_SUBSTITUTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-21952aa7c1c4.js`; view `visualization-fceeb276e3df.js` → `Visualization`.

#### Simple diffusion across a plasma membrane

Type `SIMPLE_DIFFUSION_ACROSS_MEMBRANE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1c85b0dfed0f.js`; view `visualization-10bc8f11209d.js` → `Visualization`.

#### Simple versus stratified epithelium

Type `EPITHELIAL_SIMPLE_VERSUS_STRATIFIED_BARRIERS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-96827e41dc93.js`; view `visualization-3626d746e11b.js` → `EpithelialSimpleVersusStratifiedBarriersVisualization`.

#### Single-base substitution

Type `MUTATION_BASE_SUBSTITUTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-aad7ce449b9a.js`; view `visualization-356dd20e8924.js` → `Visualization`.

#### Sinoatrial initiation, atrioventricular delay, and ventricular conduction

Cardiac electrical-conduction animation: one impulse starts at the sinoatrial node, activates the atria, pauses at the atrioventricular node, and then splits through both ventricular conduction branches to coordinate ventricular contraction.

Type `ANIMAL_CARDIAC_ELECTRICAL_CONDUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ef881225bb1f.js`; view `visualization-2751a83086fe.js` → `AnimalCardiacElectricalConductionVisualization`.

#### Sister taxa and their exclusive ancestor

Type `PHYLOGENETIC_SISTER_TAXA` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ec96b26e46c4.js`; view `visualization-7f5faa934af9.js` → `Visualization`.

#### Skeletal-muscle structural organization

Type `MUSCULOSKELETAL_SKELETAL_MUSCLE_ORGANIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-baed8a5b88f8.js`; view `visualization-b756d16976f0.js` → `MusculoskeletalSkeletalMuscleOrganizationVisualization`.

#### Skin and mucosal barrier defense

How can skin and mucus stop a pathogen before infection? Explain why intact epithelium, mucus trapping, and directed surface clearance prevent pathogens from reaching internal tissue.

Type `SKIN_MUCUS_PHYSICAL_CHEMICAL_BARRIERS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f00157b0e889.js`; view `visualization-90bec415fded.js` → `SkinMucusPhysicalChemicalBarriersVisualization`.

#### Skin layers and accessory structures

Type `INTEGUMENT_SKIN_LAYERS_AND_ACCESSORY_STRUCTURES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9b37492c65f2.js`; view `visualization-66b821ac64bd.js` → `IntegumentSkinLayersAndAccessoryStructuresVisualization`.

#### Small-scale DNA mutations

Type `MUTATIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f22d40e897cf.js`; view `visualization-b752f3335e67.js` → `Visualization`.

#### Smooth and folded membranes with the same projected cell width

Type `CELL_SIZE_MEMBRANE_FOLDING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3cf3e2230e6f.js`; view `visualization-5a485343b15b.js` → `CellSizeMembraneFoldingVisualization`.

#### Sodium-potassium pump active transport

Type `SODIUM_POTASSIUM_ACTIVE_TRANSPORT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-53c5621a933e.js`; view `visualization-49f104f9766a.js` → `Visualization`.

#### Somatic versus autonomic motor pathways

A somatic motor neuron travels directly from the central nervous system to skeletal muscle, while an autonomic motor pathway uses two neurons joined in a peripheral ganglion.

Type `SOMATIC_VERSUS_AUTONOMIC_MOTOR_PATHWAYS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-504118e2c088.js`; view `visualization-5fd953306a4e.js` → `SomaticVersusAutonomicMotorPathwaysVisualization`.

#### Somatotopic sensory cortical representation

Type `SENSORY_SOMATOTOPIC_CORTICAL_REPRESENTATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c53cdcd511d8.js`; view `visualization-10d66dbfb1fb.js` → `Visualization`.

#### Specialized nerve, muscle, and secretory structures support different functions

Specialized cell structure and function: a neuron uses its long axon to signal, a muscle cell uses aligned fibers to contract, and a secretory cell exports protein-containing vesicles.

Type `SPECIALIZED_CELL_STRUCTURE_AND_FUNCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ad726e2626ee.js`; view `visualization-64a486107d6f.js` → `Visualization`.

#### Sperm versus egg specialization

Sperm versus egg specialization: Animal sperm and eggs are both haploid gametes but differ in structure and role: sperm have a compact genetic head, energy-supporting midpiece, and motile flagellum, while the larger oocyte supplies a haploid nucleus, abundant cytoplasm, and resources for early development.

Type `ANIMAL_SPERM_VERSUS_EGG_SPECIALIZATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-2264e623055f.js`; view `visualization-40a214ba3906.js` → `AnimalSpermVersusEggSpecializationVisualization`.

#### Spermatogenesis versus oogenesis

Spermatogenesis versus oogenesis: Both spermatogenesis and oogenesis use meiosis to generate haploid cells. Spermatogenesis partitions cytoplasm relatively evenly among four functional sperm, whereas oogenesis retains most cytoplasm in one functional egg and partitions the remaining chromosome sets into small polar bodies; exact polar-body number can vary.

Type `ANIMAL_SPERMATOGENESIS_VERSUS_OOGENESIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-486c524c8a25.js`; view `visualization-5a14047c0546.js` → `AnimalSpermatogenesisVersusOogenesisVisualization`.

#### Spindle checkpoint requires bipolar attachment before anaphase

Type `SPINDLE_ASSEMBLY_CHECKPOINT_ATTACHMENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ac9239514bc7.js`; view `visualization-8b970339b228.js` → `Visualization`.

#### Sponge filter feeding

Type `ANIMAL_SPONGE_FILTER_FEEDING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9013930a3d2c.js`; view `visualization-11a93656dd93.js` → `AnimalSpongeFilterFeedingVisualization`.

#### Squamous, cuboidal, and columnar epithelial cells

Type `EPITHELIAL_SQUAMOUS_CUBOIDAL_COLUMNAR_CELL_SHAPES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-dfd608ddf1e1.js`; view `visualization-ab599e9476ff.js` → `EpithelialSquamousCuboidalColumnarCellShapesVisualization`.

#### Stable allele frequencies across generations

Type `POPULATION_GENETICS_EQUILIBRIUM_ACROSS_GENERATIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7ccbb2803f74.js`; view `visualization-20afb4a840ea.js` → `Visualization`.

#### Stem vascular-bundle cross section

Flowering-plant stem cross section showing an outer epidermis, surrounding ground tissue, a central pith, and a ring of vascular bundles with xylem toward the center and phloem toward the outside

Type `PLANT_STEM_VASCULAR_BUNDLE_CROSS_SECTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-bbfe8c75e571.js`; view `visualization-6d75a7933aea.js` → `Visualization`.

#### Stem-cell differentiation: neuronal gene expression precedes specialized structure

Stem-cell differentiation: an unspecialized stem cell retains the same genome, activates neuronal gene expression, and then acquires specialized neuron structure.

Type `STEM_CELL_DIFFERENTIATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-a029640dedb7.js`; view `visualization-841033c422d4.js` → `Visualization`.

#### Stem-cell potency narrows from totipotent to a restricted neuronal lineage

Stem-cell potency and lineage restriction: totipotent cells can form all tissues, pluripotent cells retain multiple body-cell fates, and a multipotent neuronal progenitor produces its related neuronal lineage while preserving the same genome.

Type `STEM_CELL_POTENCY_AND_LINEAGE_RESTRICTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7dcb52ef948e.js`; view `visualization-9146914b6c86.js` → `Visualization`.

#### Stored fossil carbon, human combustion, and atmospheric accumulation

Why does releasing long-stored fossil carbon increase atmospheric carbon dioxide? Predict that rapid transfer of carbon from long-term geological storage to the atmosphere increases atmospheric carbon dioxide when removal does not keep pace.

Type `BIOGEOCHEMICAL_CARBON_FOSSIL_FUEL_IMBALANCE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-96d9ff82458b.js`; view `visualization-c158b96b58e7.js` → `Visualization`.

#### Stored seed food supports growth until first true leaves develop

Seed food reserves: stored food is visibly depleted while the first root and upward shoot grow, then the first true leaves use sunlight to begin making new food.

Type `ORGANISM_SEED_RESERVES_TO_FIRST_LEAVES` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-525177d04c19.js`; view `visualization-6949a5d683a6.js` → `OrganismSeedReservesToFirstLeavesVisualization`.

#### Substrate concentration raises enzyme activity until active sites saturate

Type `ENZYME_SUBSTRATE_SATURATION_KINETICS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-191de9d49e6a.js`; view `visualization-8f8653bba03d.js` → `Visualization`.

#### Sugar-phosphate backbone

A nucleic-acid strand runs from its 5-prime end to its 3-prime end through repeating sugars and phosphates, while the attached A, G, T, and C bases carry sequence information.

Type `SUGAR_PHOSPHATE_BACKBONE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1ca029de8929.js`; view `visualization-8d69b77aace3.js` → `Visualization`.

#### Sulfhydryl groups forming a disulfide bond

Type `BIOLOGICAL_SULFHYDRYL_DISULFIDE_BOND_FORMATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-bd6cdbdaf26f.js`; view `visualization-cd2fd92c6c72.js` → `Visualization`.

#### Sunlight energy travels through food to animal activity and heat

Sunlight energy enters a plant, travels in plant-made food to an animal, and emerges as usable energy and heat while food matter remains distinct.

Type `SUNLIGHT_FOOD_ENERGY_AND_HEAT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-eac0a546ddd0.js`; view `visualization-9598401e8601.js` → `Visualization`.

#### Superficial skin regeneration versus deeper collagen scarring

Type `SKIN_SUPERFICIAL_REGENERATION_VERSUS_DEEP_SCAR` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-85dba1f309e2.js`; view `visualization-cd0580b2aa4d.js` → `SkinSuperficialRegenerationVersusDeepScarVisualization`.

#### sustainable-fisheries-harvest-population-recovery

Type `SUSTAINABLE_FISHERIES_HARVEST_POPULATION_RECOVERY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1776f8d89e90.js`; view `visualization-656239cfa9bd.js` → `SustainableFisheriesHarvestPopulationRecoveryVisualization`.

#### Sweat and sebaceous glands use different secretion routes

Type `INTEGUMENT_SWEAT_VERSUS_SEBACEOUS_GLAND_SECRETION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3b01ed20948d.js`; view `visualization-fda63dbb8209.js` → `IntegumentSweatVersusSebaceousGlandSecretionVisualization`.

#### Sweating and evaporative cooling

Type `SKIN_SWEAT_EVAPORATION_COOLING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-da74e4fc3144.js`; view `visualization-550d18d8ac90.js` → `SkinSweatEvaporationCoolingVisualization`.

#### Symbiosis outcome comparison

Type `SYMBIOSIS_OUTCOME_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-fccea7da84e7.js`; view `visualization-4cb398fc29b3.js` → `SymbiosisOutcomeComparisonVisualization`.

#### Sympathetic adrenal medulla response

Type `SYMPATHETIC_ADRENAL_MEDULLA_RESPONSE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4ad7a58993ce.js`; view `visualization-4d1177ea229b.js` → `Visualization`.

#### Synovial-joint structure

Type `MUSCULOSKELETAL_SYNOVIAL_JOINT_CARTILAGE_AND_FLUID` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-24211dc7b30e.js`; view `visualization-5ea42cb3c02c.js` → `MusculoskeletalSynovialJointCartilageAndFluidVisualization`.

#### Systemic blood pressure falls most steeply across resistance arterioles

Systemic blood-pressure gradient: a connected route leads from the heart through an artery, narrow resistance arteriole, capillary, and vein; pressure starts high in the artery, drops most steeply across the arteriole, and remains low through capillaries and veins.

Type `ANIMAL_SYSTEMIC_BLOOD_PRESSURE_GRADIENT` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-73b3d9f0adfb.js`; view `visualization-66eace04fae4.js` → `AnimalSystemicBloodPressureGradientVisualization`.

#### Systemic capillary exchange at body tissues

Animated systemic capillary exchange: oxygen-rich blood brings oxygen and absorbed food nutrients to a body cell, carbon dioxide produced by the cell returns into the blood, and the same blood becomes oxygen-poor at the tissue.

Type `ANIMAL_SYSTEMIC_CAPILLARY_TISSUE_EXCHANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ecf6f560f3a3.js`; view `visualization-3c6dfa28da6d.js` → `AnimalSystemicCapillaryTissueExchangeVisualization`.

#### Temporal versus spatial summation

Temporal summation combines closely repeated inputs from one synapse, while spatial summation combines simultaneous inputs from separate synapses; both can reach neuronal firing threshold.

Type `TEMPORAL_VERSUS_SPATIAL_SUMMATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-17ac95f695ab.js`; view `visualization-a172eb889090.js` → `TemporalVersusSpatialSummationVisualization`.

#### Ten and twenty percent recombination correspond to unequal linked chromosome intervals

Type `LINKAGE_DISTANCE_AND_RECOMBINATION_FREQUENCY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5c06b35a88e6.js`; view `visualization-36098fcee004.js` → `LinkageDistanceAndRecombinationFrequencyVisualization`.

#### Tendril thigmotropism and touch coiling

Type `TENDRIL_THIGMOTROPISM_TOUCH_COILING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-581b22ad7267.js`; view `visualization-c7cdf0a8129c.js` → `Visualization`.

#### The same DNA sequence is compared in tightly packed inaccessible chromatin and open accessible chromatin with RNA polymerase and transcript output.

Type `CHROMATIN_ACCESSIBILITY_GENE_EXPRESSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e6bc5423dc0f.js`; view `visualization-da9d8cf3d879.js` → `Visualization`.

#### The same food and oxygen atoms rearrange as separate energy is released

The same carbon, hydrogen, and oxygen atoms in food and oxygen regroup as carbon dioxide and water while energy is released separately.

Type `MATTER_IS_REARRANGED_ENERGY_IS_RELEASED` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d646e6416600.js`; view `visualization-bde24af18b2e.js` → `Visualization`.

#### The same neuronal gene is accessible in a neuron and compact in a muscle cell

Cell-specific chromatin accessibility: the same neuronal gene is open and transcribed in a nerve cell but compact and comparatively silent in a muscle cell.

Type `CHROMATIN_ACCESSIBILITY_AND_CELL_IDENTITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5db16323776f.js`; view `visualization-ac9a97b640d8.js` → `Visualization`.

#### The same received signal activates different intracellular pathways in two target cells

Pathway-specific cell responses: two target cells bind the same extracellular signal, but different intracellular signaling proteins produce enzyme activation in one cell and gene expression in the other.

Type `PATHWAY_SPECIFIC_CELL_RESPONSES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-76490f668ce8.js`; view `visualization-425e88c58272.js` → `Visualization`.

#### Three additive genes create seven dosage classes and a symmetric 1:6:15:20:15:6:1 distribution

Type `POLYGENIC_INHERITANCE_CONTINUOUS_VARIATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-86cd0157a229.js`; view `visualization-b3292fdee78b.js` → `PolygenicInheritanceContinuousVariationVisualization`.

#### Three AP Biology amino-acid R-group categories

Type `AMINO_ACID_SIDE_CHAIN_PROPERTIES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8d32179b3852.js`; view `visualization-b24b0c33e2b2.js` → `AminoAcidSideChainPropertiesVisualization`.

#### Three domains and common ancestry

Type `LIFE_THREE_DOMAINS_AND_COMMON_ANCESTOR` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-83c27ef11d12.js`; view `visualization-afc8e3737685.js` → `Visualization`.

#### Three generations of connected autosomal dominant Aa-to-child transmission

Type `MENDELIAN_AUTOSOMAL_DOMINANT_PEDIGREE_TRANSMISSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9dcc2e8e146d.js`; view `visualization-569c33cc14bb.js` → `Visualization`.

#### Three levels of biodiversity

Type `BIODIVERSITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-fc8da6ee3c53.js`; view `visualization-1329a72f717e.js` → `Visualization`.

#### Three ordered protein kinases use separate ATP phosphates and reversible phosphatase activity

Phosphorylation cascade architecture: an activated receptor feeds three ordered protein kinases, each phosphorylation uses a separate ATP-derived phosphate, a phosphatase removes phosphate, and the final kinase activates a response.

Type `PHOSPHORYLATION_CASCADE_ARCHITECTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-72787eb264c0.js`; view `visualization-a2037f55255a.js` → `Visualization`.

#### Three population-level ABO alleles and four two-allele blood phenotypes

Type `ABO_MULTIPLE_ALLELES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f3b8a5dd0737.js`; view `visualization-a798b55ac118.js` → `AboMultipleAllelesVisualization`.

#### Three separate ATP-derived phosphates sequentially activate a protein-kinase cascade

Phosphorylation cascade animation: three separate ATP-derived phosphates activate three protein kinases one after another, and the last activated kinase turns on the downstream response.

Type `PHOSPHORYLATION_CASCADE_ACTIVATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4ccd6d7b7174.js`; view `visualization-bfe815992459.js` → `Visualization`.

#### Three-prime poly-A tail addition

Type `THREE_PRIME_POLY_A_TAIL_ADDITION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b41904e68997.js`; view `visualization-1f65adf98b42.js` → `Visualization`.

#### Tight junction blocks the route between adjacent animal cells

One extracellular molecule approaches the space between neighboring animal cells and stops at a tight-junction seal that blocks the paracellular route.

Type `TIGHT_JUNCTION_BARRIER` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-4bf6420bb5b4.js`; view `visualization-38aff6e507fb.js` → `Visualization`.

#### Tight-junction epithelial barrier

Type `EPITHELIAL_TIGHT_JUNCTION_SELECTIVE_BARRIER` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b152dcc3c867.js`; view `visualization-e0c5cbeb847f.js` → `EpithelialTightJunctionSelectiveBarrierVisualization`.

#### Tip order versus evolutionary relatedness

Type `PHYLOGENETIC_TIP_ORDER_MISCONCEPTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-dd16ce5a35d7.js`; view `visualization-94879a63c8d7.js` → `Visualization`.

#### Tissue fluid, lymph-node immunity, and venous return

Lymphatic fluid-return animation: fluid leaves a blood capillary for body tissue, enters a blind-ended one-way lymph vessel, passes a white blood cell inside a lymph node, and returns through a lymphatic duct into systemic venous blood.

Type `ANIMAL_LYMPHATIC_FLUID_RETURN_AND_IMMUNITY` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-851682e94321.js`; view `visualization-27d2730428fe.js` → `AnimalLymphaticFluidReturnAndImmunityVisualization`.

#### Total microscope magnification

Type `MICROSCOPY_OBJECTIVE_EYEPIECE_TOTAL_MAGNIFICATION` · manifest v2 · animated thumbnail · not in the type enum.

Source: manifest `type-73bc95687614.js`; view `visualization-510919e575da.js` → `Visualization`.

#### Tracing a most recent common ancestor

Type `PHYLOGENETIC_COMMON_ANCESTOR_TRACING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1f8990b5904a.js`; view `visualization-dfa385bd4170.js` → `Visualization`.

#### Transcription and RNA processing

Type `TRANSCRIPTION_AND_RNA_PROCESSING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7a6838122995.js`; view `visualization-3cff949b4390.js` → `Visualization`.

#### Transcription elongation and RNA synthesis

Type `TRANSCRIPTION_ELONGATION_RNA_SYNTHESIS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ac3675c15171.js`; view `visualization-540651f48e52.js` → `Visualization`.

#### Transcription termination and RNA release

Type `TRANSCRIPTION_TERMINATION_RNA_RELEASE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-caaa65c169e6.js`; view `visualization-629c2b905d33.js` → `Visualization`.

#### Transcription unit promoter and terminator

Type `TRANSCRIPTION_UNIT_PROMOTER_TERMINATOR` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d11021362679.js`; view `visualization-75d294ea6a9c.js` → `Visualization`.

#### Translation elongation: A-site entry, peptide transfer, translocation

Type `TRANSLATION_ELONGATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-336e52c18ea4.js`; view `visualization-e603464ceadb.js` → `TranslationElongationVisualization`.

#### Translation initiation: AUG, initiator methionine, and P site

Type `TRANSLATION_INITIATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b956405a451b.js`; view `visualization-bffcf2fbd939.js` → `TranslationInitiationVisualization`.

#### Translation termination: UAA, release factor, and released peptide

Type `TRANSLATION_TERMINATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-10ad0f646a17.js`; view `visualization-ae787adf7f02.js` → `TranslationTerminationVisualization`.

#### Translation: mRNA, ribosome, tRNA, and polypeptide

Type `TRANSLATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-7d1063d05668.js`; view `visualization-73ea40c59dd9.js` → `TranslationVisualization`.

#### Transmission electron microscopy versus scanning electron microscopy

Type `MICROSCOPY_TEM_VERSUS_SEM_IMAGING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-44ea58ea7d6f.js`; view `visualization-1de457a0a143.js` → `Visualization`.

#### Transpiration pull and cohesive xylem water

Water evaporates from a leaf, and a connected column of water molecules moves upward through the same xylem vessel toward the leaf

Type `PLANT_XYLEM_TRANSPIRATION_COHESION_PULL` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b52ed19f6540.js`; view `visualization-e8a6a4b99c13.js` → `Visualization`.

#### Triglyceride structure

Type `TRIGLYCERIDE_STRUCTURE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d48e755453d9.js`; view `visualization-b8fc40998e1d.js` → `TriglycerideStructureVisualization`.

#### Trophic transfer efficiency and heat loss

Type `TROPHIC_TRANSFER_EFFICIENCY_AND_HEAT_LOSS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f26d8b834324.js`; view `visualization-4848f5799762.js` → `Visualization`.

#### Two copies of the same regulatory sequence compare weak transcription with one activator against stronger expression when the full transcription-factor combination binds.

Type `TRANSCRIPTION_FACTOR_COMBINATORIAL_CONTROL` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9bb95b49538f.js`; view `visualization-b6c9cc92dbf2.js` → `Visualization`.

#### Two independently assorting chromosome pairs produce four possible haploid parental-origin combinations across meioses

Type `GAMETE_CHROMOSOME_COMBINATION_DIVERSITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-ed582bc170d9.js`; view `visualization-6c2b3b3d3323.js` → `Visualization`.

#### Two independently oriented homologous pairs segregate into complementary mixed-origin cells

Type `INDEPENDENT_ASSORTMENT_CHROMOSOME_SEGREGATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9e2e4f96d5df.js`; view `visualization-f9961f7ee840.js` → `Visualization`.

#### Two recognizable eukaryotic cells retain the same genome while different regulatory states activate different genes and produce different proteins.

Type `CELL_TYPE_SPECIFIC_GENE_EXPRESSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9b624db869d2.js`; view `visualization-fe9f20711149.js` → `Visualization`.

#### Type I, II, and III ecological survivorship curves

Type `POPULATION_ECOLOGY_SURVIVORSHIP_CURVES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-faa491a1c84a.js`; view `visualization-f8f5f84b3bca.js` → `Visualization`.

#### Undirected isopod kinesis and favorable-habitat retention

Type `KINESIS_ENVIRONMENTAL_ACCUMULATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-db92c466be6e.js`; view `visualization-c9db25b7f7bf.js` → `KinesisEnvironmentalAccumulationVisualization`.

#### Unscaled branch length versus relatedness

Type `PHYLOGENETIC_BRANCH_LENGTH_MISCONCEPTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5b89cbee5ff6.js`; view `visualization-f7d21a5fd077.js` → `Visualization`.

#### Vaccine-induced immune memory

How can a vaccine prepare a faster response without requiring the disease? Explain how exposure to a vaccine antigen establishes antigen-specific adaptive memory that supports a faster response to later encounter with the matching pathogen.

Type `VACCINE_INDUCED_IMMUNE_MEMORY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d5f1f871ded8.js`; view `visualization-ac5f7ef22a41.js` → `VaccineInducedImmuneMemoryVisualization`.

#### Vertebrate diversity and adaptations

Type `VERTEBRATE_DIVERSITY_AND_ADAPTATIONS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-79df90570682.js`; view `visualization-1d5a4f2f3d9a.js` → `Visualization`.

#### Vertebrate shared derived innovation cladogram

Type `VERTEBRATE_SHARED_DERIVED_INNOVATION_CLADOGRAM` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-18c1051b36a2.js`; view `visualization-971e8acc507e.js` → `Visualization`.

#### Vertebrate skin and reproduction on land

Type `VERTEBRATE_SKIN_AND_REPRODUCTION_ON_LAND` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-59d01fc89060.js`; view `visualization-5b3ce5b7ae3a.js` → `Visualization`.

#### Vestibular rotation and hair-cell signaling

Type `SENSORY_VESTIBULAR_ROTATION_HAIR_CELL_SIGNALING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5101f91c02b7.js`; view `visualization-89cb2316375b.js` → `Visualization`.

#### Viruses and prokaryotes

Type `VIRUSES_AND_PROKARYOTES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-88107789d63f.js`; view `visualization-694a429b58ce.js` → `VirusesAndProkaryotesVisualization`.

#### Visual sensory pathway from retina to cortex

Type `SENSORY_VISUAL_RETINA_CORTEX_PATHWAY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d2beaf09ff5a.js`; view `visualization-a5896b84d142.js` → `Visualization`.

#### Water adhesion and capillary rise

Type `WATER_ADHESION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b98b5f150a4c.js`; view `visualization-7f78d53e34de.js` → `Visualization`.

#### Water autoionization, hydronium, and hydroxide

Type `BIOLOGICAL_WATER_AUTOIONIZATION_HYDRONIUM_HYDROXIDE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-978d8b153dc0.js`; view `visualization-1dd7310e7def.js` → `Visualization`.

#### Water high heat of vaporization and evaporative cooling

Type `WATER_EVAPORATIVE_COOLING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-10560b6b1e94.js`; view `visualization-8160a8fe3705.js` → `Visualization`.

#### Water infiltration, groundwater movement, and surface discharge

How can precipitation return to surface water through groundwater? Trace one conserved water marker through precipitation, infiltration, connected soil pore spaces, groundwater movement, and discharge into surface water.

Type `BIOGEOCHEMICAL_WATER_INFILTRATION_AND_GROUNDWATER_RETURN` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-34fa4d2188aa.js`; view `visualization-4d8924e7c864.js` → `Visualization`.

#### Water molecule polarity

Type `WATER_MOLECULE_POLARITY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3f98a719cdac.js`; view `visualization-dfb72c809a9e.js` → `Visualization`.

#### Water phase changes and return pathways

How can one water molecule evaporate, condense, precipitate, and return to surface water? Trace the same water through evaporation, condensation, precipitation, and surface runoff while distinguishing movement between reservoirs from changes of state.

Type `BIOGEOCHEMICAL_WATER_PHASE_CHANGE_AND_RETURN` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-55b70b78423f.js`; view `visualization-f0cbf2bf9f4e.js` → `Visualization`.

#### Water structure and hydrogen bonding

Type `STRUCTURE_OF_WATER_HYDROGEN_BONDING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-30b271c923a2.js`; view `visualization-5e6f047df514.js` → `Visualization`.

#### Water surface tension

Type `WATER_SURFACE_TENSION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-900de7db375d.js`; view `visualization-a333908ff07c.js` → `Visualization`.

#### Water-soluble surface receptors versus lipid-soluble internal receptors

A water-soluble signal stays outside and binds a surface receptor, while a lipid-soluble signal crosses the membrane to bind an intracellular receptor.

Type `CELL_RECEPTOR_LOCATION_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-44959a606b0f.js`; view `visualization-17c52df25a93.js` → `CellReceptorLocationComparisonVisualization`.

#### When lactose is already present and glucose falls, cAMP binds CAP, the CAP–cAMP complex recruits RNA polymerase, and lac transcription increases.

Type `LAC_OPERON_CATABOLITE_ACTIVATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c7643a3d5e8b.js`; view `visualization-b7e9d379f58c.js` → `Visualization`.

#### Whole-organism cooling restores temperature toward a set point

Type `PHYSIOLOGICAL_THERMOREGULATION_NEGATIVE_FEEDBACK` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d71d53aba559.js`; view `visualization-a63fef13fda3.js` → `PhysiologicalThermoregulationNegativeFeedbackVisualization`.

#### Why a whale is a mammal, not a fish

Type `VERTEBRATE_WHALE_MAMMAL_NOT_FISH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3ccbde9870dd.js`; view `visualization-f24c371b0ab5.js` → `Visualization`.

#### Why small cells exchange materials efficiently

Type `CELL_SIZE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-5573d3c7efeb.js`; view `visualization-ccc237b2bdbc.js` → `CellSizeVisualization`.

#### Withdrawal-reflex sensory and motor response

A painful hand stimulus travels along a sensory neuron into the spinal cord. A spinal interneuron activates a motor neuron, skeletal muscle contracts, and the same hand withdraws before conscious brain processing is needed.

Type `WITHDRAWAL_REFLEX_SENSORY_MOTOR_RESPONSE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-e55422374e65.js`; view `visualization-8eda9958c1b1.js` → `WithdrawalReflexSensoryMotorResponseVisualization`.

#### Xylem and phloem transport comparison

One flowering plant comparing upward xylem water transport from roots with phloem sugar movement from a source leaf toward both shoot and root sinks

Type `PLANT_XYLEM_PHLOEM_TRANSPORT_COMPARISON` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9fa238b86f42.js`; view `visualization-40e5094388d9.js` → `Visualization`.

#### Xylem water and transpiration stream

One continuous water marker moving from roots upward through stem xylem to a leaf and leaving as transpired water vapor

Type `PLANT_XYLEM_WATER_TRANSPIRATION_STREAM` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f380070a883b.js`; view `visualization-cd62aa80cb5b.js` → `Visualization`.

#### Yeast budding reproduction

Type `YEAST_BUDDING_REPRODUCTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-76a5aa97f57d.js`; view `visualization-4b118336e142.js` → `Visualization`.

### Other views (no three.js or Lottie dependency) (809)

#### Abo rh blood typing

Type `ABO_RH_BLOOD_TYPING` · manifest v2.

Parameters: `initial_blood_type` (enum, default `A+`, one of `O-`, `O+`, `A-`, `A+`, `B-`, `B+`, `AB-`, `AB+`).

Source: manifest `model-20fa5aabbc94.js`; view `visualization-6763ec8967a0.js` → `AboRhBloodTypingVisualization`.

#### Abo rh transfusion compatibility

Type `ABO_RH_TRANSFUSION_COMPATIBILITY` · manifest v1.

Parameters: `donorType` (enum, default `A+`, one of `O-`, `O+`, `A-`, `A+`, `B-`, `B+`, `AB-`, `AB+`); `recipientType` (enum, default `B-`, one of `O-`, `O+`, `A-`, `A+`, `B-`, `B+`, `AB-`, `AB+`).

Source: manifest `type-99cca3d49ce0.js`; view `visualization-af8e44b0aa9a.js` → `AboRhTransfusionVisualization`.

#### Absorbance spectrum

Measurement wavelength

Type `ABSORBANCE_SPECTRUM` · manifest v4.

Parameters: `lambda_max_nm` (number, default `520`, range 210 to 740).

Source: manifest `type-dfeec9c7c75e.js`; view `visualization-81b289769070.js` → `Visualization`.

#### Absorption variable costing inventory profit: `\mathrm{OI}_{A}-\mathrm{OI}_{V}=\Delta I\times \mathrm{FOH}_{u}`

Type `ABSORPTION_VARIABLE_COSTING_INVENTORY_PROFIT` · manifest v3 · formula `\mathrm{OI}_{A}-\mathrm{OI}_{V}=\Delta I\times \mathrm{FOH}_{u}`.

Parameters: `unitsProduced` (integer, default `800`, range 100 to 10000); `unitsSold` (integer, default `600`, range 100 to 10000).

Source: manifest `type-796063db4408.js`; view `visualization-f28c0547e6cf.js` → `AbsorptionVariableCostingVisualization`.

#### Accrual vs cash accounting

Type `ACCRUAL_VS_CASH_ACCOUNTING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-c8f2378524ba.js` → `AccrualVsCashAccountingVisualization`.

#### Accuracy vs precision targets

Average position relative to the reference value

Type `ACCURACY_VS_PRECISION_TARGETS` · manifest v1.

Parameters: `meanPosition` (enum, default `centered`, one of `centered`, `offset`); `measurementSpread` (enum, default `small`, one of `small`, `large`).

Source: manifest `type-c3de85d12da6.js`; view `visualization-e79c08bf2db5.js` → `AccuracyPrecisionVisualization`.

#### Acid base proton transfer

Reaction example

Type `ACID_BASE_PROTON_TRANSFER`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-599f3ab2bc96.js` → `Visualization`.

#### Acid base speciation

Diprotic-acid fractional-distribution plot from pH 0 to 14, with pKa1 {pKa1} and pKa2 {pKa2}. At pH {pH}, H2A is {h2a}, HA minus is {ha}, and A two-minus is {a}; {takeaway}.

Type `ACID_BASE_SPECIATION` · manifest v2.

Parameters: `pKa1` (number, default `6.35`, range 0 to 6.5); `pKa2` (number, default `10.33`, range 7.5 to 14).

Source: manifest `model-579301f7f78f.js`; view `visualization-b2041b1eabd7.js` → `AcidBaseSpeciationVisualization`.

#### Acid base titration

Type `ACID_BASE_TITRATION` · manifest v4.

Parameters: `experiment` (enum, default `strong-strong`, one of `strong-strong`, `strong-weak`, `weak-strong`); `acidVolumeMl` (number, default `0`, range 0 to 20).

Source: manifest `model-b31ccf83cf9c.js`; view `visualization-08ec0ad8d289.js` → `AcidBaseTitrationVisualization`.

#### Acid deposition

Acid-deposition pathway stage

Type `ACID_DEPOSITION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-59a14cb53fc8.js` → `Visualization`.

#### Acid strength and conjugate base stability

Acidity comparison

Type `ACID_STRENGTH_AND_CONJUGATE_BASE_STABILITY` · manifest v2.

Parameters: `comparison` (enum, default `resonance`, one of `resonance`, `inductive`, `atom-trend`, `hybridization`).

Source: manifest `model-7206de562b9d.js`; view `visualization-ee146f50ca06.js` → `Visualization`.

#### Action potential neuron

Action potential stage

Type `ACTION_POTENTIAL_NEURON`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-eb134c0ebc73.js` → `Visualization`.

#### Action potential nodes

Action potential position

Type `ACTION_POTENTIAL_NODES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-2d6ce0e130e8.js` → `ActionPotentialNodesVisualization`.

#### Action potential voltage

Type `ACTION_POTENTIAL_VOLTAGE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3777ec9d7362.js` → `ActionPotentialVoltageVisualization`.

#### Activation energy distribution

Temperature in kelvin

Type `ACTIVATION_ENERGY_DISTRIBUTION` · manifest v4.

Parameters: `initial_temperature_k` (number, default `600`, range 300 to 900); `activation_energy_kj_mol` (number, default `16`, range 8 to 28).

Source: manifest `type-a73db772b207.js`; view `visualization-6d1592f14674.js` → `ActivationEnergyDistributionVisualization`.

#### Active vs passive immunity

Type `ACTIVE_VS_PASSIVE_IMMUNITY` · manifest v2.

Parameters: `initial_example` (enum, default `vaccination`, one of `infection-and-recovery`, `vaccination`, `maternal-antibodies`, `immune-globulin`).

Source: manifest `model-c57d1e222f54.js`; view `visualization-78b3b6b07708.js` → `Visualization`.

#### Acute inflammation

Acute inflammation stage

Type `ACUTE_INFLAMMATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-af4f59f26e71.js` → `AcuteInflammationVisualization`.

#### Acute triangle

Type `ACUTE_TRIANGLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-5a1b7e26a895.js` → `AcuteTriangleVisualization`.

#### Add fractions

Type `ADD_FRACTIONS` · manifest v4.

Parameters: `firstNumerator` (integer, default `1`, range 1 to 4); `firstDenominator` (integer, default `3`, range 2 to 6); `secondNumerator` (integer, default `3`, range 1 to 4); `secondDenominator` (integer, default `6`, range 2 to 6).

Source: manifest `type-4b5ff0bb4ae8.js`; view `visualization-f76b207108a3.js` → `AddFractionsVisualization`.

#### Adding integers

Type `ADDING_INTEGERS` · manifest v1.

Parameters: `firstAddend` (integer, default `3`, range 1 to 12); `secondAddend` (integer, default `6`, range 1 to 12).

Source: manifest `model-1ff2e69cbdc9.js`; view `visualization-13de6660e01c.js` → `AddingIntegersVisualization`.

#### Adding negative integer

Type `ADDING_NEGATIVE_INTEGER` · manifest v1.

Parameters: `positiveInteger` (integer, default `7`, range 1 to 12); `negativeInteger` (integer, default `-4`, range -12 to -1).

Source: manifest `model-5b5c3055d254.js`; view `visualization-d68164019221.js` → `AddingNegativeIntegerVisualization`.

#### Adsr envelope

ADSR parameter

Type `ADSR_ENVELOPE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-13f53a257506.js` → `AdsrEnvelopeVisualization`.

#### Age structure pyramid

Age-structure pattern

Type `AGE_STRUCTURE_PYRAMID` · manifest v4.

Parameters: `initial_pattern` (enum, default `expansive`, one of `expansive`, `stationary`, `constrictive`).

Source: manifest `type-19661ffd37c1.js`; view `visualization-834a48f02e7b.js` → `Visualization`.

#### Aggregate demand

Type `AGGREGATE_DEMAND`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b446e0e1b16c.js` → `AggregateDemandVisualization`.

#### Aggregate demand and supply

Aggregate demand position

Type `AGGREGATE_DEMAND_AND_SUPPLY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-48e95cd4c1a2.js` → `AdAsEquilibriumVisualization`.

#### Agricultural soil erosion

Erosion stage

Type `AGRICULTURAL_SOIL_EROSION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a13991d41243.js` → `Visualization`.

#### Alcohol oxidation products

Type `ALCOHOL_OXIDATION_PRODUCTS` · manifest v1.

Parameters: `oxidationConditions` (enum, default `dess_martin`, one of `dess_martin`, `jones_reagent`).

Source: manifest `model-9f7763fa34f6.js`; view `visualization-924d96a4add7.js` → `AlcoholOxidationProductsVisualization`.

#### Alkene e z stereochemistry

Type `ALKENE_E_Z_STEREOCHEMISTRY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f8cea6ad30bd.js` → `Visualization`.

#### Alkene stereochemical additions

Addition pathway

Type `ALKENE_STEREOCHEMICAL_ADDITIONS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-167a3d41a23c.js` → `Visualization`.

#### Alveolar gas exchange

Gas to emphasize

Type `ALVEOLAR_GAS_EXCHANGE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-e1240482429a.js` → `AlveolarGasExchangeVisualization`.

#### Amino acids and peptide bonds

Amino-acid pair

Type `AMINO_ACIDS_AND_PEPTIDE_BONDS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d7a4eb58e4db.js` → `Visualization`.

#### Angular frequency relation: `\omega = 2\pi f`

Type `ANGULAR_FREQUENCY_RELATION` · manifest v3 · formula `\omega = 2\pi f`, also `\omega = \frac{2\pi}{T}`, `\omega = \frac{d\theta}{dt}`, `\omega = \sqrt{\frac{k}{m}}`, `\omega = \sqrt{k/m}`, `\omega^2 = \frac{k}{m}`, `f = \frac{\omega}{2\pi}`, `T = \frac{2\pi}{\omega}`, `\omega = 2\pi f = \frac{2\pi}{T}`, `(\omega = 2\pi f)`, `2\pi f = \omega`, `w=2pif`, `omega=2pif`, `2pif=omega`, `2pif=w`, `omega = 2 pi f`, `w=2pi/t`, `omega=2pi/t`, `f=w/2pi`, `f=omega/2pi`, `w=dtheta/dt`, `omega=dtheta/dt`, `w=sqrt(k/m)`, `omega=sqrt(k/m)`, `w^2=k/m`, `omega^2=k/m`.

Parameters: `frequency` (number, default `1.5`, range 0.01 to 1000).

Source: manifest `type-dd26222ad182.js`; view `visualization-c1b6f2641f40.js` → `AngularFrequencyRelationVisualization`.

#### Animal life cycle

Animal

Type `ANIMAL_LIFE_CYCLE` · manifest v2.

Parameters: `animal` (enum, default `butterfly`, one of `butterfly`, `frog`, `chicken`, `mammal`).

Source: manifest `type-11d77b78e3d4.js`; view `visualization-58357e0f3f35.js` → `AnimalLifeCycleVisualization`.

#### Anova decomposition: `F = \frac{\text{between-group variation}}{\text{within-group variation}}`

Data view

Type `ANOVA_DECOMPOSITION` · manifest v4 · formula `F = \frac{\text{between-group variation}}{\text{within-group variation}}`.

Parameters: `groupA1` (number, default `32`, range 0 to 100); `groupA2` (number, default `36`, range 0 to 100); `groupA3` (number, default `38`, range 0 to 100); `groupA4` (number, default `40`, range 0 to 100); `groupA5` (number, default `43`, range 0 to 100); `groupA6` (number, default `45`, range 0 to 100); `groupB1` (number, default `44`, range 0 to 100); `groupB2` (number, default `47`, range 0 to 100); `groupB3` (number, default `49`, range 0 to 100); `groupB4` (number, default `51`, range 0 to 100); `groupB5` (number, default `53`, range 0 to 100); `groupB6` (number, default `56`, range 0 to 100); `groupC1` (number, default `55`, range 0 to 100); `groupC2` (number, default `58`, range 0 to 100); `groupC3` (number, default `60`, range 0 to 100); `groupC4` (number, default `62`, range 0 to 100); `groupC5` (number, default `65`, range 0 to 100); `groupC6` (number, default `66`, range 0 to 100).

Source: manifest `model-2ea1a60fd78b.js`; view `visualization-f55089d8b690.js` → `AnovaDecompositionVisualization`.

#### Anova interaction plot

Choose an interaction pattern

Type `ANOVA_INTERACTION_PLOT` · manifest v2.

Parameters: `initial_pattern` (enum, default `no-interaction`, one of `no-interaction`, `non-crossover-interaction`, `crossover-interaction`).

Source: manifest `model-485af57b772f.js`; view `visualization-96f35cc28b9e.js` → `Visualization`.

#### Antibiotic resistance

Antibiotic resistance stage

Type `ANTIBIOTIC_RESISTANCE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-9325f8c7164a.js` → `Visualization`.

#### Antibody structure

Type `ANTIBODY_STRUCTURE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d39c32c93c65.js` → `Visualization`.

#### Apoptosis

Initiating signal

Type `APOPTOSIS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-e2e9cf248240.js` → `Visualization`.

#### Aquifer and groundwater

Type `AQUIFER_AND_GROUNDWATER`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7c3b190f7eae.js` → `Visualization`.

#### Arc length

Arc-length proof step

Type `ARC_LENGTH`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f7295264b95c.js` → `ArcLengthVisualization`.

#### Arithmetic mean

Value {number}

Type `ARITHMETIC_MEAN` · manifest v3.

Parameters: `observation1` (integer, default `2`, range 1 to 10); `observation2` (integer, default `4`, range 1 to 10); `observation3` (integer, default `7`, range 1 to 10).

Source: manifest `type-501bb4244183.js`; view `visualization-ab1be399984a.js` → `ArithmeticMeanVisualization`.

#### Arithmetic sequence: `a_n = a_1 + (n - 1)d`

Type `ARITHMETIC_SEQUENCE` · manifest v4 · formula `a_n = a_1 + (n - 1)d`.

Parameters: `firstTerm` (integer, default `2`, range -6 to 6); `commonDifference` (integer, default `3`, range -4 to 4); `termNumber` (integer, default `5`, range 1 to 6).

Source: manifest `model-d8a81301bcce.js`; view `visualization-1b39c1e95fb5.js` → `ArithmeticSequenceVisualization`.

#### Arithmetic sequence sum formula

Type `ARITHMETIC_SEQUENCE_SUM_FORMULA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-465747daa5a7.js` → `ArithmeticSequenceSumVisualization`.

#### Arithmetic vs geometric: `\begin{aligned} a_n &= a_1 + (n - 1)d \\ g_n &= a_1 r^{n - 1} \end{aligned}`

Type `ARITHMETIC_VS_GEOMETRIC` · manifest v3 · formula `\begin{aligned} a_n &= a_1 + (n - 1)d \\ g_n &= a_1 r^{n - 1} \end{aligned}`.

Parameters: `commonDifference` (number, default `2`, range -20 to 20); `commonRatio` (number, default `2`, range -3 to 3).

Source: manifest `model-5dd2c88fcae7.js`; view `visualization-acf075be1bb1.js` → `ArithmeticVsGeometricVisualization`.

#### Aromaticity and huckels rule

Cyclic species

Type `AROMATICITY_AND_HUCKELS_RULE` · manifest v1.

Parameters: `initial_example` (enum, default `benzene`, one of `benzene`, `cyclobutadiene`, `cyclooctatetraene`, `cyclopentadienyl-anion`, `cyclopropenyl-cation`).

Source: manifest `type-4644d5bf838d.js`; view `visualization-6745af30010c.js` → `Visualization`.

#### Array queue front rear

Queue mode

Type `ARRAY_QUEUE_FRONT_REAR` · manifest v2.

Parameters: `mode` (enum, default `linear`, one of `linear`, `circular`).

Source: manifest `model-9eabfa87d180.js`; view `visualization-9bf0275cc836.js` → `ArrayQueueFrontRearVisualization`.

#### Asymmetric key roles

Choose the security goal

Type `ASYMMETRIC_KEY_ROLES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1c01a7e1ddf2.js` → `AsymmetricKeyRolesVisualization`.

#### Atherosclerosis

Atherosclerosis stage

Type `ATHEROSCLEROSIS` · manifest v4.

Parameters: `initial_stage` (enum, default `established plaque`, one of `healthy artery`, `fatty streak`, `established plaque`, `plaque rupture and thrombus`).

Source: manifest `type-c62486043386.js`; view `visualization-9e4feb3388d9.js` → `AtherosclerosisVisualization`.

#### Atmospheric layers

Atmospheric temperature profile. At {altitudeCount, plural, one {{altitude} kilometer} other {{altitude} kilometers}}, the selected point is in the {layer}; temperature generally {trend} with further ascent. The nearest boundary is the {boundary} near {boundaryAltitudeCount, plural, one {{boundaryAltitude} kilometer} other {{boundaryAltitude} kilometers}}.

Type `ATMOSPHERIC_LAYERS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d3250227f8e7.js` → `AtmosphericLayersVisualization`.

#### Atmospheric pollution plume

Atmospheric stability regime

Type `ATMOSPHERIC_POLLUTION_PLUME` · manifest v4.

Parameters: `initial_plume_regime` (enum, default `looping`, one of `looping`, `coning`, `fanning`, `lofting`, `fumigation`, `trapping`).

Source: manifest `type-b367cfc0fc69.js`; view `visualization-f298bdb8fa14.js` → `Visualization`.

#### Atomic composition

Type `ATOMIC_COMPOSITION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3df16c1f8b13.js` → `AtomicCompositionVisualization`.

#### Atp cycle

ATP cycle phase

Type `ATP_CYCLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-313183449346.js` → `AtpCycleVisualization`.

#### Autocorrelation

Time-series pattern

Type `AUTOCORRELATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d1e2efa9a183.js` → `Visualization`.

#### Average speed distance time

Type `AVERAGE_SPEED_DISTANCE_TIME`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-cf70365044e8.js` → `AverageSpeedDistanceTimeVisualization`.

#### Avogadros law: `\frac{V_1}{n_1}=\frac{V_2}{n_2}`

Amount of gas relative to the reference

Type `AVOGADROS_LAW` · manifest v2 · formula `\frac{V_1}{n_1}=\frac{V_2}{n_2}`.

Parameters: `reference_amount_mol` (number, default `1`, range 0.25 to 5); `reference_volume_l` (number, default `22.4`, range 1 to 120).

Source: manifest `model-5a84276bd5aa.js`; view `visualization-badabc2b6722.js` → `Visualization`.

#### Balancing equations

Coefficient for {formula}

Type `BALANCING_EQUATIONS` · manifest v4.

Parameters: `reaction_example` (enum, default `hydrogen-and-oxygen-to-water`, one of `hydrogen-and-oxygen-to-water`, `nitrogen-and-hydrogen-to-ammonia`, `methane-combustion`).

Source: manifest `type-ee78dd3b1e31.js`; view `visualization-631072230633.js` → `BalancingEquationsVisualization`.

#### Bank credit money multiplier: `m = \frac{1}{r}`

Type `BANK_CREDIT_MONEY_MULTIPLIER` · manifest v3 · formula `m = \frac{1}{r}`.

Parameters: `initialDepositUsd` (number, default `1000`, range 100 to 2000); `reserveRatioPercent` (number, default `10`, range 5 to 50).

Source: manifest `model-deaf0a16998f.js`; view `visualization-b7dbcc617f97.js` → `BankCreditMoneyMultiplierVisualization`.

#### Bar magnet field strength

Type `BAR_MAGNET_FIELD_STRENGTH`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ba1483c611f2.js` → `BarMagnetFieldStrengthVisualization`.

#### Bayes theorem

Type `BAYES_THEOREM`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f98f59e073da.js` → `BayesTheoremVisualization`.

#### Bayesian beta binomial updating

Type `BAYESIAN_BETA_BINOMIAL_UPDATING` · manifest v3.

Parameters: `prior_alpha` (number, default `5`, range 1.5 to 6); `prior_beta` (number, default `5`, range 1.5 to 6); `observed_successes` (integer, default `6`, range 0 to 12); `observed_failures` (integer, default `2`, range 0 to 12).

Source: manifest `model-65899196f0dd.js`; view `visualization-79725d341dbb.js` → `BayesianBetaBinomialVisualization`.

#### Beer lambert law: `A = \varepsilon c l`

Type `BEER_LAMBERT_LAW` · manifest v3 · formula `A = \varepsilon c l`, also `A=\varepsilon l c`, `A = \epsilon c l`, `c = \frac{A}{\varepsilon l}`, `l = \frac{A}{\varepsilon c}`, `\varepsilon = \frac{A}{c l}`.

Parameters: `molarAbsorptivity` (number, default `1.2`, range 0.01 to 100000); `concentration` (number, default `0.8`, range 0.01 to 10); `pathLength` (number, default `1`, range 0.01 to 100).

Source: manifest `type-b34069051dae.js`; view `visualization-f6df49392bd6.js` → `BeerLambertLawVisualization`.

#### Beta oxidation cycle

Type `BETA_OXIDATION_CYCLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-338573c29e64.js` → `BetaOxidationVisualization`.

#### Bfs dfs traversal

Traversal algorithm

Type `BFS_DFS_TRAVERSAL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-561b7a14b0aa.js` → `Visualization`.

#### Big o growth comparison

Input size n

Type `BIG_O_GROWTH_COMPARISON` · manifest v1.

Parameters: `n` (integer, default `10`, range 1 to 20).

Source: manifest `model-d45c8c7b3dc6.js`; view `visualization-4dfe4f5879e6.js` → `BigOGrowthComparisonVisualization`.

#### Big o time complexity

Input size n

Type `BIG_O_TIME_COMPLEXITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b1d2965a7fe6.js` → `BigOTimeComplexityVisualization`.

#### Binary heap operations

Heap operation

Type `BINARY_HEAP_OPERATIONS` · manifest v2.

Parameters: `heap_kind` (enum, default `min-heap`, one of `min-heap`, `max-heap`); `initial_operation` (enum, default `insert`, one of `insert`, `remove-root`).

Source: manifest `model-775baaf06261.js`; view `visualization-bc6da395a847.js` → `BinaryHeapOperationsVisualization`.

#### Binary place value

Decimal value from 0 to 255

Type `BINARY_PLACE_VALUE` · manifest v3.

Parameters: `initial_value` (integer, default `45`, range 0 to 255).

Source: manifest `model-e76cabbd5aab.js`; view `visualization-2c53898df203.js` → `BinaryPlaceValueVisualization`.

#### Binary search

Target value; type an exact value or use the slider

Type `BINARY_SEARCH` · manifest v4.

Parameters: `target` (integer, default `55`, range 10 to 100).

Source: manifest `model-d9cf6b8411c6.js`; view `visualization-3fe6c1c8a1f9.js` → `BinarySearchVisualization`.

#### Binary search tree insertion

Insertion order

Type `BINARY_SEARCH_TREE_INSERTION` · manifest v3.

Parameters: `insertionSequence` (enum, default `mixed`, one of `mixed`, `balanced`, `ascending`).

Source: manifest `model-5abcde22832d.js`; view `visualization-e7d9aeb0961f.js` → `BinarySearchTreeInsertionVisualization`.

#### Binomial distribution

Type `BINOMIAL_DISTRIBUTION` · manifest v6.

Parameters: `trials` (integer, default `6`, range 1 to 10); `successPercent` (number, default `50`, range 0 to 100).

Source: manifest `model-4378a4161730.js`; view `visualization-82b1fd7a9ff3.js` → `BinomialDistributionVisualization`.

#### Binomial square

Type `BINOMIAL_SQUARE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-636f47db18b5.js` → `BinomialSquareVisualization`.

#### Binomial theorem pascal triangle: `(a+b)^n = \sum_{k=0}^{n}\binom{n}{k}a^{n-k}b^k`

Type `BINOMIAL_THEOREM_PASCAL_TRIANGLE` · manifest v2 · formula `(a+b)^n = \sum_{k=0}^{n}\binom{n}{k}a^{n-k}b^k`.

Parameters: `n` (integer, default `5`, range 0 to 6).

Source: manifest `model-3791234ec878.js`; view `visualization-8db294476df1.js` → `BinomialTheoremPascalTriangleVisualization`.

#### Biological ph and buffers: `\mathrm{pH}=\mathrm{p}K_a+\log_{10}\!\left(\frac{[A^-]}{[HA]}\right)`

Weak-acid buffer titration curve. At {challenge} buffer equivalents of {direction}, pH is {ph}; H A is {acidPercent} and A minus is {basePercent}. The pKa is {pKa}. {reserve}.

Type `BIOLOGICAL_PH_AND_BUFFERS` · manifest v3 · formula `\mathrm{pH}=\mathrm{p}K_a+\log_{10}\!\left(\frac{[A^-]}{[HA]}\right)`.

Parameters: `pKa` (number, default `7.2`, range 4.5 to 9.5).

Source: manifest `type-9b7b6f94e6e1.js`; view `visualization-d113f30d2511.js` → `Visualization`.

#### Biomagnification

Food-chain stage

Type `BIOMAGNIFICATION` · manifest v2.

Parameters: `contaminant` (enum, default `DDT`, one of `DDT`, `methylmercury`, `PCBs`).

Source: manifest `model-aae321d23dad.js`; view `visualization-4c39ab7af5d2.js` → `Visualization`.

#### Biome climatograph

Biome climatograph with mean annual temperature on the horizontal axis and annual precipitation on the vertical axis. The selected climate is {temperature} degrees Celsius and {precipitation} centimeters per year, {biome}.

Type `BIOME_CLIMATOGRAPH` · manifest v2.

Parameters: `mean_annual_temperature_c` (number, default `18`, range -15 to 30); `annual_precipitation_cm` (number, default `100`, range 0 to 450).

Source: manifest `type-894614f7a446.js`; view `visualization-a7984e0cd407.js` → `BiomeClimatographVisualization`.

#### Blockchain hash chain

Type `BLOCKCHAIN_HASH_CHAIN` · manifest v3.

Parameters: `chainState` (enum, default `original`, one of `original`, `tamper_block_1`, `tamper_block_2`, `tamper_block_3`).

Source: manifest `model-c23e01a5b875.js`; view `visualization-6f305f2c35d0.js` → `BlockchainHashChainVisualization`.

#### Blood circulation

Type `BLOOD_CIRCULATION` · manifest v3.

Parameters: `circulation` (enum, default `pulmonary`, one of `pulmonary`, `systemic`).

Source: manifest `model-135f4cf52f9c.js`; view `visualization-2b73bf613785.js` → `BloodCirculationVisualization`.

#### Blood glucose regulation

Type `BLOOD_GLUCOSE_REGULATION` · manifest v3.

Parameters: `initial_condition` (enum, default `high`, one of `high`, `low`).

Source: manifest `model-106204ffd60a.js`; view `visualization-90800fd902e8.js` → `BloodGlucoseVisualization`.

#### Blood pressure regulation

Type `BLOOD_PRESSURE_REGULATION` · manifest v2.

Parameters: `initial_pressure_condition` (enum, default `high`, one of `low`, `normal`, `high`).

Source: manifest `model-e9d53ce0f19d.js`; view `visualization-59a780a9c3d6.js` → `BloodPressureVisualization`.

#### Blue white screening

Vector state

Type `BLUE_WHITE_SCREENING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-0aab429e2952.js` → `BlueWhiteScreeningVisualization`.

#### Boiling point elevation: `\Delta T_b=iK_bm`

Solute molality

Type `BOILING_POINT_ELEVATION` · manifest v3 · formula `\Delta T_b=iK_bm`.

Parameters: `solvent` (enum, default `benzene`, one of `water`, `benzene`); `initial_solute_molality` (number, default `0.15`, range 0 to 0.25); `initial_particle_factor` (integer, default `2`, range 1 to 3).

Source: manifest `model-aed74d60f0d7.js`; view `visualization-d95accf99093.js` → `BoilingPointElevationVisualization`.

#### Bomb calorimetry

Combustible sample mass

Type `BOMB_CALORIMETRY` · manifest v3.

Parameters: `sample_mass_g` (number, default `1`, range 0.25 to 2); `combustion_energy_kj_per_g` (number, default `24`, range 15 to 35); `calorimeter_heat_capacity_kj_per_k` (number, default `12`, range 8 to 25).

Source: manifest `type-cb7946b61519.js`; view `visualization-903d086ce8b7.js` → `BombCalorimetryVisualization`.

#### Bond energy curve

Covalent bond order

Type `BOND_ENERGY_CURVE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-187f754cd8f8.js` → `BondEnergyCurveVisualization`.

#### Bond polarity: `\Delta \chi = |\chi_2 - \chi_1|`

{atomName} ({symbol}), Pauling electronegativity {electronegativity}

Type `BOND_POLARITY` · manifest v2 · formula `\Delta \chi = |\chi_2 - \chi_1|`.

Parameters: `atom1` (enum, default `H`, one of `H`, `C`, `O`, `F`, `Cl`); `atom2` (enum, default `Cl`, one of `H`, `C`, `O`, `F`, `Cl`).

Source: manifest `model-940064895671.js`; view `visualization-545530bba802.js` → `BondPolarityVisualization`.

#### Boolean logic

Type `BOOLEAN_LOGIC` · manifest v2.

Parameters: `inputA` (boolean, default `true`); `inputB` (boolean, default `false`); `operator` (enum, default `and`, one of `and`, `or`).

Source: manifest `type-8da18ccae221.js`; view `visualization-9fd0afb6be1c.js` → `BooleanLogicVisualization`.

#### Boolean truth table

Type `BOOLEAN_TRUTH_TABLE` · manifest v3.

Parameters: `inputA` (boolean, default `true`); `inputB` (boolean, default `true`); `operator` (enum, default `OR`, one of `AND`, `OR`, `XOR`, `XNOR`).

Source: manifest `model-57f01654f1a3.js`; view `visualization-3fdaaac2891b.js` → `BooleanTruthTableVisualization`.

#### Bootstrap distribution

Central confidence level

Type `BOOTSTRAP_DISTRIBUTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b7a0a23ddef1.js` → `BootstrapDistributionVisualization`.

#### Born haber cycle

Ionic compound

Type `BORN_HABER_CYCLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-50dd81f94efc.js` → `Visualization`.

#### Break even quantity

Type `BREAK_EVEN_QUANTITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f2b76a44b7ec.js` → `BreakEvenQuantityVisualization`.

#### Breathing mechanics

Breathing phase

Type `BREATHING_MECHANICS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4878888f3881.js` → `Visualization`.

#### Bubble sort

Bubble sort actions

Type `BUBBLE_SORT` · manifest v2.

Parameters: `initialOrder` (enum, default `mixed`, one of `mixed`, `reversed`, `nearly_sorted`, `few_swaps`).

Source: manifest `model-37272c97cf25.js`; view `visualization-7dc8174c6438.js` → `BubbleSortVisualization`.

#### Buffer composition: `\mathrm{pH}=\mathrm{p}K_a+\log_{10}\!\left(\frac{[A^-]}{[HA]}\right)`

Conjugate-base-to-weak-acid ratio

Type `BUFFER_COMPOSITION` · manifest v4 · formula `\mathrm{pH}=\mathrm{p}K_a+\log_{10}\!\left(\frac{[A^-]}{[HA]}\right)`.

Parameters: `pKa` (number, default `4.76`, range 2 to 12); `baseToAcidRatio` (number, default `1`, range 0.01 to 100).

Source: manifest `type-4aeefa8d363c.js`; view `visualization-6a22d92f862a.js` → `BufferCompositionVisualization`.

#### Buffer ph strong acid base

Type `BUFFER_PH_STRONG_ACID_BASE` · manifest v4.

Parameters: `netStrongAcidMinusBaseMoles` (number, default `0`, range -0.02 to 0.02).

Source: manifest `model-cf55e77d3f7b.js`; view `visualization-206cf8785f78.js` → `BufferPhStrongAcidBaseVisualization`.

#### Buoyancy

Type `BUOYANCY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-87cffc7abadc.js` → `BuoyancyVisualization`.

#### Business cycles

Examined time in the business cycle

Type `BUSINESS_CYCLES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ab0a3655070e.js` → `BusinessCyclesVisualization`.

#### C array pointer arithmetic

Type `C_ARRAY_POINTER_ARITHMETIC` · manifest v3.

Parameters: `index` (integer, default `3`, range 0 to 7).

Source: manifest `model-d82ec1ece7ce.js`; view `visualization-b45ad9571f79.js` → `CArrayPointerArithmeticVisualization`.

#### Cadences

Type `CADENCES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-46c2a793b8aa.js` → `Visualization`.

#### Calcium pth calcitonin feedback

Type `CALCIUM_PTH_CALCITONIN_FEEDBACK` · manifest v4.

Parameters: `calciumCondition` (enum, default `low`, one of `low`, `high`).

Source: manifest `model-ff8cd9e1b433.js`; view `visualization-f0d42c2fda87.js` → `CalciumFeedbackVisualization`.

#### Calvin cycle

Calvin-cycle phase

Type `CALVIN_CYCLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-dcdd5a493e75.js` → `CalvinCycleVisualization`.

#### Capillary starling forces: `J_v=K_f[(P_c-P_i)-\sigma(\pi_c-\pi_i)]`

Select a Starling pressure

Type `CAPILLARY_STARLING_FORCES` · manifest v2 · formula `J_v=K_f[(P_c-P_i)-\sigma(\pi_c-\pi_i)]`.

Parameters: `initial_scenario` (enum, default `typical-systemic-capillary`, one of `typical-systemic-capillary`, `raised-capillary-hydrostatic-pressure`, `reduced-plasma-oncotic-pressure`, `raised-interstitial-oncotic-pressure`, `raised-interstitial-hydrostatic-pressure`).

Source: manifest `type-f530fb4543f1.js`; view `visualization-631f25c8c3e6.js` → `CapillaryStarlingVisualization`.

#### Capital flows

Domestic versus foreign real interest rate

Type `CAPITAL_FLOWS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-9ab94ab7741e.js` → `CapitalFlowsVisualization`.

#### Carbohydrate structure

Type `CARBOHYDRATE_STRUCTURE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-8befc31b069f.js` → `Visualization`.

#### Carbon cycle

Carbon pathway

Type `CARBON_CYCLE` · manifest v2.

Parameters: `initial_pathway` (enum, default `biological cycle`, one of `biological cycle`, `ocean exchange`, `long-term storage and combustion`).

Source: manifest `model-2389f073136d.js`; view `visualization-3c7cab86ecac.js` → `CarbonCycleVisualization`.

#### Carbonyl nucleophilic addition

Carbonyl substrate

Type `CARBONYL_NUCLEOPHILIC_ADDITION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f2d013640160.js` → `Visualization`.

#### Cardiac action potential

Ventricular action-potential phase

Type `CARDIAC_ACTION_POTENTIAL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7f13f58ed818.js` → `CardiacActionPotentialVisualization`.

#### Cardiac cycle

Cardiac-cycle phase

Type `CARDIAC_CYCLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-71e159f431a4.js` → `Visualization`.

#### Cardiac output product: `CO = HR \times SV`

Cardiac output pulse animation controls

Type `CARDIAC_OUTPUT_PRODUCT` · manifest v5 · formula `CO = HR \times SV`.

Parameters: `heartRateBeatsPerMinute` (number, default `70`, range 40 to 180); `strokeVolumeMilliliters` (number, default `70`, range 30 to 120).

Source: manifest `type-33538976a327.js`; view `visualization-89ed891f32fa.js` → `CardiacOutputProductVisualization`.

#### Catalyst activation energy

Catalyst effectiveness

Type `CATALYST_ACTIVATION_ENERGY` · manifest v4.

Parameters: `catalystEffectivenessPercent` (number, default `50`, range 0 to 100).

Source: manifest `type-af7f92e44cfd.js`; view `visualization-9cad72591cf8.js` → `CatalystActivationEnergyVisualization`.

#### Cathodic protection

Cathodic-protection state

Type `CATHODIC_PROTECTION` · manifest v2.

Parameters: `anode_material` (enum, default `magnesium`, one of `magnesium`, `zinc`).

Source: manifest `model-a538838ccb34.js`; view `visualization-43e0d3ab9102.js` → `Visualization`.

#### Cell cycle

Cell-cycle phase

Type `CELL_CYCLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1e81eba61b18.js` → `CellCycleVisualization`.

#### Cell cycle checkpoints

Checkpoint

Type `CELL_CYCLE_CHECKPOINTS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-91ed02c6af02.js` → `CellCycleCheckpointsVisualization`.

#### Cell junctions

Selected epithelial junction

Type `CELL_JUNCTIONS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-35a7f4346a3f.js` → `Visualization`.

#### Cell membrane transport

Transport mechanism

Type `CELL_MEMBRANE_TRANSPORT` · manifest v2.

Parameters: `mechanism` (enum, default `diffusion`, one of `diffusion`, `facilitatedDiffusion`, `activeTransport`).

Source: manifest `model-89c283b46546.js`; view `visualization-a9b010bbad78.js` → `Visualization`.

#### Cell organelles

Cell type

Type `CELL_ORGANELLES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a6318f3ee732.js` → `Visualization`.

#### Cell signaling pathway

Cell signaling stage

Type `CELL_SIGNALING_PATHWAY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-e635602b1834.js` → `CellSignalingPathwayVisualization`.

#### Cellular respiration inputs outputs

{glucose, plural, one {# glucose molecule} other {# glucose molecules}}

Type `CELLULAR_RESPIRATION_INPUTS_OUTPUTS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-88e10371c56b.js` → `CellularRespirationVisualization`.

#### Central limit theorem

Population shape

Type `CENTRAL_LIMIT_THEOREM` · manifest v4.

Parameters: `population_shape` (enum, default `right-skewed`, one of `right-skewed`, `uniform`, `bimodal`, `normal`); `sample_size` (integer, default `5`, range 1 to 100).

Source: manifest `type-c608c5f26be7.js`; view `visualization-a042de137fcc.js` → `CentralLimitTheoremVisualization`.

#### Centripetal force mvr: `F_c = \frac{mv^2}{r}`

Type `CENTRIPETAL_FORCE_MVR` · manifest v2 · formula `F_c = \frac{mv^2}{r}`.

Parameters: `massKilograms` (number, default `2`, range 0.5 to 5); `speedMetersPerSecond` (number, default `4`, range 0 to 8); `radiusMeters` (number, default `2`, range 1 to 5).

Source: manifest `type-3b03c35824de.js`; view `visualization-bb8c275b28b2.js` → `CentripetalForceVisualization`.

#### Change of basis: `P_B\mathbf{v}_B=\mathbf{v}`

Type `CHANGE_OF_BASIS` · manifest v1 · formula `P_B\mathbf{v}_B=\mathbf{v}`, also `[\mathbf v]_{\mathrm{std}}=P[\mathbf v]_B`, `[\mathbf v]_B=P^{-1}[\mathbf v]_{\mathrm{std}}`.

Parameters: `vectorX` (number, default `3`, range -5 to 5); `vectorY` (number, default `1`, range -5 to 5); `basis1X` (number, default `1`, range -4 to 4); `basis1Y` (number, default `0`, range -4 to 4); `basis2X` (number, default `0`, range -4 to 4); `basis2Y` (number, default `1`, range -4 to 4).

Source: manifest `model-17f47a9d9054.js`; view `visualization-ba3f3a45191e.js` → `ChangeOfBasisVisualization`.

#### Charles law: `\frac{V_1}{T_1} = \frac{V_2}{T_2}`

Type `CHARLES_LAW` · manifest v3 · formula `\frac{V_1}{T_1} = \frac{V_2}{T_2}`, also `V_1/T_1 = V_2/T_2`, `v1/t1=v2/t2`, `v2/t2=v1/t1`, `v/t=k`, `k=v/t`, `v=kt`, `kt=v`.

Parameters: `v1` (number, default `12`, range 0.01 to 10000); `t1` (number, default `300`, range 1 to 5000); `v2` (number, default `18`, range 0.01 to 10000); `t2` (number, default `450`, range 1 to 5000); `solveFor` (enum, default `v2`, one of `v1`, `t1`, `v2`, `t2`).

Source: manifest `type-fa03d5dd9600.js`; view `visualization-c9aa0d162481.js` → `CharlesLawVisualization`.

#### Chemiosmosis

Chemiosmosis process stage

Type `CHEMIOSMOSIS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b42acd1750ee.js` → `ChemiosmosisVisualization`.

#### Chi square distribution

Degrees of freedom

Type `CHI_SQUARE_DISTRIBUTION` · manifest v3.

Parameters: `degrees_of_freedom` (integer, default `5`, range 1 to 20); `observed_value` (number, default `11.1`, range 0 to 30).

Source: manifest `model-a66b5ddc2f62.js`; view `visualization-1bfb6f0cbbfd.js` → `ChiSquareDistributionVisualization`.

#### Chi square goodness of fit: `\chi^2 = \sum \frac{(O_i-E_i)^2}{E_i}`

Observed count for category {category}

Type `CHI_SQUARE_GOODNESS_OF_FIT` · manifest v2 · formula `\chi^2 = \sum \frac{(O_i-E_i)^2}{E_i}`.

Parameters: `observedA` (integer, default `18`, range 5 to 60); `observedB` (integer, default `22`, range 5 to 60); `observedC` (integer, default `27`, range 5 to 60); `observedD` (integer, default `33`, range 5 to 60).

Source: manifest `type-f50250083878.js`; view `visualization-4dc16463b8ed.js` → `ChiSquareGoodnessOfFitVisualization`.

#### Chi square independence

Type `CHI_SQUARE_INDEPENDENCE` · manifest v3.

Parameters: `observedTopLeft` (integer, default `54`, range 20 to 60); `observedTopRight` (integer, default `26`, range 20 to 60); `observedBottomLeft` (integer, default `30`, range 20 to 60); `observedBottomRight` (integer, default `30`, range 20 to 60).

Source: manifest `model-12b1180c259e.js`; view `visualization-4e5fbbf4a3c8.js` → `ChiSquareIndependenceVisualization`.

#### Chirality and r s configuration

Choose a stereochemistry example

Type `CHIRALITY_AND_R_S_CONFIGURATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-c6d5a4948828.js` → `Visualization`.

#### Chord construction

Type `CHORD_CONSTRUCTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-81bfc8032ab5.js` → `Visualization`.

#### Chromatography

Chromatogram development

Type `CHROMATOGRAPHY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-render-f7e9f8b7a9dc.js` → `Visualization`.

#### Circle area: `A = \pi r^2`

Type `CIRCLE_AREA` · manifest v3 · formula `A = \pi r^2`, also `A = \frac{\pi d^2}{4}`, `\pi r^2`, `\frac{\pi d^2}{4}`, `pir^2=a`, `pid^2/4=a`.

Parameters: `radius` (number, default `3`, range 0.01 to 10000).

Source: manifest `template-f75272b4eabf.js`; view `visualization-d0ba9fd63e5a.js` → `CircleAreaVisualization`.

#### Circle circumference: `C = 2\pi r`

Type `CIRCLE_CIRCUMFERENCE` · manifest v5 · formula `C = 2\pi r`, also `2\pi r = C`, `C = \pi d`, `\pi d = C`, `r = \frac{C}{2\pi}`, `d = \frac{C}{\pi}`.

Parameters: `radius` (number, default `3`, range 0.01 to 10000).

Source: manifest `template-d09a2fe7dec8.js`; view `visualization-94d2bf2f0845.js` → `CircleCircumferenceVisualization`.

#### Classes of levers

Type `CLASSES_OF_LEVERS` · manifest v3.

Parameters: `leverClass` (enum, default `first`, one of `first`, `second`, `third`).

Source: manifest `type-93019a122ac1.js`; view `visualization-72ab71aea469.js` → `ClassesOfLeversVisualization`.

#### Classical conditioning

Type `CLASSICAL_CONDITIONING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4ef5d985e0b8.js` → `ClassicalConditioningVisualization`.

#### Classification threshold

Type `CLASSIFICATION_THRESHOLD` · manifest v5.

Parameters: `threshold` (number, default `0.5`, range 0 to 1).

Source: manifest `type-dca95d451915.js`; view `visualization-da9b8fde1b3b.js` → `ClassificationThresholdVisualization`.

#### Classification tree

Revealed tree depth

Type `CLASSIFICATION_TREE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4b2845cbe907.js` → `ClassificationTreeVisualization`.

#### Climate feedback loops

Climate mechanism

Type `CLIMATE_FEEDBACK_LOOPS` · manifest v2.

Parameters: `initial_mechanism` (enum, default `ice-albedo`, one of `ice-albedo`, `water-vapor`, `radiative-response`); `initial_change` (enum, default `warming`, one of `warming`, `cooling`).

Source: manifest `type-81172b31949f.js`; view `visualization-ff18e88f256c.js` → `ClimateFeedbackLoopsVisualization`.

#### Climate mitigation wedges

{count, plural, =0 {zero wedges} one {one wedge} other {# wedges}}

Type `CLIMATE_MITIGATION_WEDGES` · manifest v3.

Parameters: `required_wedges` (integer, default `7`, range 3 to 12); `horizon_years` (integer, default `50`, range 20 to 100).

Source: manifest `type-6a0aad7ace5c.js`; view `visualization-a4aefed332fb.js` → `ClimateMitigationWedgesVisualization`.

#### Clonal selection and immune memory

Clonal-selection stage

Type `CLONAL_SELECTION_AND_IMMUNE_MEMORY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-aa2afbd34259.js` → `ClonalSelectionVisualization`.

#### Co2 and temperature time series

Climate time span

Type `CO2_AND_TEMPERATURE_TIME_SERIES` · manifest v3.

Parameters: `initial_time_span` (enum, default `industrial-era`, one of `industrial-era`, `paleoclimate`).

Source: manifest `model-7fd3bf30713f.js`; view `visualization-b7f341f01770.js` → `Visualization`.

#### Coal power plant

Generation stage

Type `COAL_POWER_PLANT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7aed2fc93169.js` → `CoalPowerPlantVisualization`.

#### Codon chart

Type `CODON_CHART` · manifest v2.

Parameters: `first_base` (enum, default `A`, one of `U`, `C`, `A`, `G`); `second_base` (enum, default `U`, one of `U`, `C`, `A`, `G`); `third_base` (enum, default `G`, one of `U`, `C`, `A`, `G`).

Source: manifest `model-7fc37b4d721d.js`; view `visualization-67d0b31ab703.js` → `CodonChartVisualization`.

#### Cohens d: `d = \frac{\bar{x}_2 - \bar{x}_1}{s_{\mathrm{pooled}}}`

Signed difference between group 2 and group 1 means

Type `COHENS_D` · manifest v2 · formula `d = \frac{\bar{x}_2 - \bar{x}_1}{s_{\mathrm{pooled}}}`.

Parameters: `initial_mean_difference` (number, default `0.8`, range -4 to 4); `pooled_standard_deviation` (number, default `1`, range 0.75 to 2).

Source: manifest `type-8848a63b92ff.js`; view `visualization-03902545342f.js` → `CohensDVisualization`.

#### Coin flipping

Type `COIN_FLIPPING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-cc59d25d6a40.js` → `CoinFlippingVisualization`.

#### Collision orientation

Type `COLLISION_ORIENTATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-84f6d3cbd551.js` → `CollisionOrientationVisualization`.

#### Collision simulation: `m_1v_{1,i} + m_2v_{2,i} = m_1v_{1,f} + m_2v_{2,f}`

Type `COLLISION_SIMULATION` · manifest v5 · formula `m_1v_{1,i} + m_2v_{2,i} = m_1v_{1,f} + m_2v_{2,f}`.

Parameters: `cartAInitialVelocityMps` (number, default `2`, range -3 to 3); `cartBInitialVelocityMps` (number, default `-1.5`, range -3 to 3); `collisionType` (enum, default `elastic`, one of `elastic`, `perfectlyInelastic`).

Source: manifest `type-833c7fb020af.js`; view `visualization-8282521c046a.js` → `CollisionSimulationVisualization`.

#### Combination formula

Type `COMBINATION_FORMULA` · manifest v4.

Parameters: `n` (integer, default `6`, range 4 to 8); `r` (integer, default `3`, range 2 to 4).

Source: manifest `type-1635fe6bba2b.js`; view `visualization-609a794e6615.js` → `CombinationFormulaVisualization`.

#### Combined gas law

Type `COMBINED_GAS_LAW`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-5cd59ec5cb83.js` → `CombinedGasLawVisualization`.

#### Combining like terms tiles

Example {number}: {expression}

Type `COMBINING_LIKE_TERMS_TILES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-9ba29f8a0acf.js` → `CombiningLikeTermsTilesVisualization`.

#### Common ion effect

Type `COMMON_ION_EFFECT` · manifest v5.

Parameters: `salt_example` (enum, default `AgCl with NaCl`, one of `AgCl with NaCl`, `CaF2 with NaF`, `Mg(OH)2 with KOH`).

Source: manifest `model-e104bfbc6342.js`; view `visualization-f22d21178ad5.js` → `CommonIonEffectVisualization`.

#### Common normal intervals

Number of standard deviations from the mean

Type `COMMON_NORMAL_INTERVALS` · manifest v5.

Parameters: `z` (number, default `1`, range 0 to 4).

Source: manifest `model-69143636c0d5.js`; view `visualization-a2306f077209.js` → `CommonNormalIntervalsVisualization`.

#### Comparative advantage trade

Producer A capacity allocated to Good X, percent

Type `COMPARATIVE_ADVANTAGE_TRADE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6def49033bcf.js` → `ComparativeAdvantageTradeVisualization`.

#### Competition and niches

Preferred-resource similarity

Type `COMPETITION_AND_NICHES` · manifest v3.

Parameters: `resource_dimension` (enum, default `food size`, one of `food size`, `habitat space`, `feeding time`).

Source: manifest `model-dc560f6410fb.js`; view `visualization-296307ba0adb.js` → `CompetitionAndNichesVisualization`.

#### Competitive firm loss

Market price

Type `COMPETITIVE_FIRM_LOSS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a9ce4191cb66.js` → `CompetitiveFirmLossVisualization`.

#### Competitive firm profit

Market price

Type `COMPETITIVE_FIRM_PROFIT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-2d139561fd14.js` → `CompetitiveFirmProfitVisualization`.

#### Competitive labor hiring

Type `COMPETITIVE_LABOR_HIRING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-71056d3c3db0.js` → `CompetitiveLaborHiringVisualization`.

#### Composite perimeter area

Choose what to measure

Type `COMPOSITE_PERIMETER_AREA` · manifest v1.

Parameters: `lowerWidth` (integer, default `6`, range 4 to 7); `lowerHeight` (integer, default `3`, range 2 to 4); `upperWidth` (integer, default `3`, range 2 to 3); `upperHeight` (integer, default `2`, range 1 to 3); `triangleRun` (integer, default `4`, range 1 to 4); `mode` (enum, default `area`, one of `area`, `perimeter`).

Source: manifest `type-94076f401ee2.js`; view `visualization-f96a2f252abc.js` → `CompositePerimeterAreaVisualization`.

#### Compound interest

Type `COMPOUND_INTEREST` · manifest v9.

Parameters: `amount` (number, default `1000`, range 0.01 to 1000000000); `ratePercent` (number, default `5`, range 0 to 100); `periods` (integer, default `20`, range 0 to 1000).

Source: manifest `type-ea02b25da175.js`; view `visualization-58f43098e47b.js` → `CompoundInterestVisualization`.

#### Compound pulley mechanical advantage: `\mathrm{IMA}=n`

Type `COMPOUND_PULLEY_MECHANICAL_ADVANTAGE` · manifest v4 · formula `\mathrm{IMA}=n`.

Parameters: `supportSegments` (integer, default `2`, range 2 to 6).

Source: manifest `type-58df9aa6d32b.js`; view `visualization-ef9a26f88771.js` → `CompoundPulleyVisualization`.

#### Compressor curve

Compressor transfer curve with threshold {threshold} decibels, ratio {ratio}, and knee width {knee} decibels. At an input of {input} decibels, output is {output} decibels with {reduction} decibels of gain reduction.

Type `COMPRESSOR_CURVE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-19a7fa186b24.js` → `Visualization`.

#### Concentration cell: `E_{\mathrm{cell}}=\frac{0.0592\,\mathrm{V}}{z}\log_{10}\!\left(\frac{c_{\mathrm{high}}}{c_{\mathrm{low}}}\right)`

Initial concentrated-to-dilute ion concentration ratio

Type `CONCENTRATION_CELL` · manifest v2 · formula `E_{\mathrm{cell}}=\frac{0.0592\,\mathrm{V}}{z}\log_{10}\!\left(\frac{c_{\mathrm{high}}}{c_{\mathrm{low}}}\right)`.

Parameters: `initial_dilute_concentration_molar` (number, default `0.001`, range 0.0001 to 0.001); `initial_concentrated_concentration_molar` (number, default `0.1`, range 0.001 to 0.1); `ion_charge` (integer, default `2`, range 1 to 3).

Source: manifest `type-facf186bb1fa.js`; view `visualization-bb2ddc2d96a0.js` → `Visualization`.

#### Conditional probability definition

Type `CONDITIONAL_PROBABILITY_DEFINITION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f2758fd5b0b7.js` → `ConditionalProbabilityDefinitionVisualization`.

#### Conductometric titration

Volume of sodium hydroxide added

Type `CONDUCTOMETRIC_TITRATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-47e34dec7d97.js` → `Visualization`.

#### Cone surface area: `A = \pi r(r + l)`

Type `CONE_SURFACE_AREA` · manifest v3 · formula `A = \pi r(r + l)`, also `A = \pi r (r + l)`, `A = \pi r^2 + \pi r l`, `A = \pi r l + \pi r^2`, `\pi r (r + l) = A`, `\pi r^2 + \pi r l = A`, `\pi r l + \pi r^2 = A`.

Parameters: `radius` (number, default `3`, range 0.01 to 10000); `slantHeight` (number, default `6`, range 0.01 to 10000).

Source: manifest `type-286f80bf78cd.js`; view `visualization-7d5ced73ac93.js` → `ConeSurfaceAreaVisualization`.

#### Cone volume: `V = \frac{1}{3}\pi r^2 h`

Type `CONE_VOLUME` · manifest v4 · formula `V = \frac{1}{3}\pi r^2 h`, also `V = \frac{1}{3} \pi r^2 h`, `V = \frac{1}{3} \pi h r^2`, `V = \pi r^2 h / 3`, `V = \pi h r^2 / 3`, `\frac{1}{3} \pi r^2 h = V`, `\frac{1}{3} \pi h r^2 = V`, `\pi r^2 h / 3 = V`, `\pi h r^2 / 3 = V`.

Parameters: `radius` (number, default `3`, range 0.01 to 10000); `height` (number, default `8`, range 0.01 to 10000).

Source: manifest `type-92907d86d962.js`; view `visualization-da7960679b7f.js` → `ConeVolumeVisualization`.

#### Confidence interval proportion: `\hat p \pm z^*\sqrt{\frac{\hat p(1-\hat p)}{n}}`

Sampling distribution of the observed sample proportion {estimate}. The {confidence} interval for the unknown population proportion runs from {lower} to {upper}, with margin of error {margin}. The central area is {confidence} and each tail is {tail}. {condition}

Type `CONFIDENCE_INTERVAL_PROPORTION` · manifest v4 · formula `\hat p \pm z^*\sqrt{\frac{\hat p(1-\hat p)}{n}}`.

Parameters: `sample_proportion` (number, default `0.4`, range 0.02 to 0.98); `sample_size` (integer, default `100`, range 100 to 400); `confidence_level` (number, default `0.95`, range 0.9 to 0.99).

Source: manifest `type-1e1a69bc5852.js`; view `visualization-2d66a943405b.js` → `Visualization`.

#### Confidence vs prediction bands

Regression plot at x equals {x}, with {count} observed responses. The {level} confidence interval for the mean is {meanLow} to {meanHigh}; the wider {level} prediction interval for one new response is {predictionLow} to {predictionHigh}. Both are centered on the fitted response {mean}.

Type `CONFIDENCE_VS_PREDICTION_BANDS` · manifest v4.

Parameters: `confidence_level` (enum, default `95%`, one of `90%`, `95%`, `99%`).

Source: manifest `model-ceec6b52318c.js`; view `visualization-e043f4425457.js` → `ConfidenceVsPredictionBandsVisualization`.

#### Confusion matrix metrics

Type `CONFUSION_MATRIX_METRICS` · manifest v2.

Parameters: `truePositiveCount` (integer, default `32`, range 0 to 100); `falsePositiveCount` (integer, default `8`, range 0 to 100); `trueNegativeCount` (integer, default `48`, range 0 to 100); `falseNegativeCount` (integer, default `12`, range 0 to 100).

Source: manifest `model-f8363e95e559.js`; view `visualization-183c47a10bd4.js` → `ConfusionMatrixMetricsVisualization`.

#### Conjugated dienes and diels alder

Type `CONJUGATED_DIENES_AND_DIELS_ALDER` · manifest v2.

Parameters: `example` (enum, default `butadiene-and-ethene`, one of `butadiene-and-ethene`, `butadiene-and-methyl-vinyl-ketone`, `butadiene-and-maleic-anhydride`).

Source: manifest `model-456ae69d4c49.js`; view `visualization-5aa4c1c0db7c.js` → `DielsAlderVisualization`.

#### Consumer and producer surplus

Type `CONSUMER_AND_PRODUCER_SURPLUS` · manifest v4.

Parameters: `demand_shift` (number, default `0`, range -2.5 to 2.5).

Source: manifest `type-1a390930447d.js`; view `visualization-bc99b0d2f249.js` → `Visualization`.

#### Consumer budget line comparative statics: `M = P_x X + P_y Y`

Budget change scenario

Type `CONSUMER_BUDGET_LINE_COMPARATIVE_STATICS` · manifest v4 · formula `M = P_x X + P_y Y`.

Parameters: `changeScenario` (enum, default `income_increase`, one of `income_increase`, `income_decrease`, `price_x_increase`, `price_x_decrease`); `changeMagnitudePercent` (number, default `30`, range 5 to 55).

Source: manifest `model-bbcfc45a37c2.js`; view `visualization-ad2049ed7f39.js` → `ConsumerBudgetLineVisualization`.

#### Context free grammar ambiguity

Type `CONTEXT_FREE_GRAMMAR_AMBIGUITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d94177f5bf0c.js` → `Visualization`.

#### Continuous uniform distribution

Selected interval width as percent of support

Type `CONTINUOUS_UNIFORM_DISTRIBUTION` · manifest v2.

Parameters: `lower_bound` (number, default `0`, range -20 to 10); `upper_bound` (number, default `15`, range 11 to 40).

Source: manifest `type-19d8b437a2d9.js`; view `visualization-39d578add7bd.js` → `Visualization`.

#### Contour lines and relief

Route endpoint A. Use arrow keys to move A.

Type `CONTOUR_LINES_AND_RELIEF`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3d04e32244fa.js` → `Visualization`.

#### Coral bleaching

Coral bleaching stage

Type `CORAL_BLEACHING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3ba52470c554.js` → `CoralBleachingVisualization`.

#### Corrective policy

Type `CORRECTIVE_POLICY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ac7e5ceb63f7.js` → `CorrectivePolicyVisualization`.

#### Correlation

Correlation direction

Type `CORRELATION` · manifest v4.

Parameters: `pattern` (enum, default `positive`, one of `negative`, `none`, `positive`).

Source: manifest `model-624ee5d1bac5.js`; view `visualization-783504919f17.js` → `CorrelationVisualization`.

#### Correlation matrix

Variable pair

Type `CORRELATION_MATRIX` · manifest v3.

Parameters: `exampleContext` (enum, default `body-measurements`, one of `body-measurements`, `vehicle-features`, `student-survey`).

Source: manifest `model-60673a8e81e9.js`; view `visualization-d10aec57fc73.js` → `CorrelationMatrixVisualization`.

#### Cortisol regulation

Type `CORTISOL_REGULATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7fc6f3e35611.js` → `CortisolRegulationVisualization`.

#### Coulombs law: `F = k\frac{q_1q_2}{r^2}`

Type `COULOMBS_LAW` · manifest v3 · formula `F = k\frac{q_1q_2}{r^2}`, also `F = k \frac{q_1 q_2}{r^2}`, `F = k_e \frac{q_1 q_2}{r^2}`, `F = \frac{k q_1 q_2}{r^2}`, `E = k\frac{q}{r^2}`, `F = k q_1 q_2 / r^2`, `k q_1 q_2 / r^2 = F`, `r = \sqrt{\frac{k q_1 q_2}{F}}`, `q_1 = \frac{F r^2}{k q_2}`, `q_2 = \frac{F r^2}{k q_1}`, `k = \frac{F r^2}{q_1 q_2}`.

Parameters: `q1` (number, default `3`, range -10000 to 10000); `q2` (number, default `-3`, range -10000 to 10000); `distance` (number, default `4`, range 0.01 to 10000).

Source: manifest `type-98e888d7432f.js`; view `visualization-b1a1dadcd106.js` → `CoulombsLawVisualization`.

#### Counting sequences

Type `COUNTING_SEQUENCES` · manifest v2.

Parameters: `optionCount` (integer, default `6`, range 4 to 8); `sequenceLength` (integer, default `3`, range 2 to 4); `replacementMode` (enum, default `with`, one of `with`, `without`).

Source: manifest `model-5170f20e545d.js`; view `visualization-db5f579de0eb.js` → `CountingSequencesVisualization`.

#### Cpu fetch decode execute

Instruction-cycle step

Type `CPU_FETCH_DECODE_EXECUTE` · manifest v2.

Parameters: `instructionExample` (enum, default `load`, one of `load`, `add`, `branch`).

Source: manifest `model-21889c1e147f.js`; view `visualization-1f1a172d9f6e.js` → `CpuFetchDecodeExecuteVisualization`.

#### Crispr cas9

Target site

Type `CRISPR_CAS9`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-9726f6aa9f5f.js` → `Visualization`.

#### Critical angle sine relation: `\sin\theta_c = \frac{n_2}{n_1}`

Type `CRITICAL_ANGLE_SINE_RELATION` · manifest v2 · formula `\sin\theta_c = \frac{n_2}{n_1}`.

Parameters: `indexRatio` (number, default `0.67`, range 0.5 to 0.95).

Source: manifest `type-945e0105df87.js`; view `visualization-832a5eb159c8.js` → `CriticalAngleSineRelationVisualization`.

#### Critical path network

Activity {task} duration in days

Type `CRITICAL_PATH_NETWORK` · manifest v1.

Parameters: `durationADays` (number, default `3`, range 1 to 10); `durationBDays` (number, default `4`, range 1 to 10); `durationCDays` (number, default `4`, range 1 to 10); `durationDDays` (number, default `3`, range 1 to 10); `durationEDays` (number, default `4`, range 1 to 10); `durationFDays` (number, default `5`, range 1 to 10).

Source: manifest `model-8a2addb2a518.js`; view `visualization-59d06554d12f.js` → `CriticalPathNetworkVisualization`.

#### Cross price elasticity: `E_{xy} = \frac{\%\Delta Q_x}{\%\Delta P_y}`

Product relationship

Type `CROSS_PRICE_ELASTICITY` · manifest v4 · formula `E_{xy} = \frac{\%\Delta Q_x}{\%\Delta P_y}`.

Parameters: `relationship` (enum, default `substitutes`, one of `substitutes`, `complements`); `priceChangeDirection` (enum, default `increase`, one of `increase`, `decrease`); `priceChangeMagnitudePercent` (number, default `30`, range 5 to 60).

Source: manifest `model-71c00d3e4c5e.js`; view `visualization-be7b75133b2f.js` → `CrossPriceElasticityVisualization`.

#### Cross product geometry: `|a\times b|=|a||b|\sin(\theta)`

Type `CROSS_PRODUCT_GEOMETRY` · manifest v1 · formula `|a\times b|=|a||b|\sin(\theta)`, also `\|\vec a\times\vec b\|=\|\vec a\|\|\vec b\|\sin(\theta)`, `\vec a\times\vec b`, `\vec b\times\vec a=-(\vec a\times\vec b)`, `\|\vec a\times\vec b\|=\text{parallelogram area}`.

Parameters: `magnitudeA` (number, default `3`, range 0.5 to 6); `magnitudeB` (number, default `2.5`, range 0.5 to 6); `angleDeg` (number, default `60`, range 5 to 175); `order` (enum, default `axb`, one of `axb`, `bxa`).

Source: manifest `type-25a004ce6551.js`; view `visualization-32bac933d90c.js` → `CrossProductGeometryVisualization`.

#### Crossing over

Crossing over stage

Type `CROSSING_OVER`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-392a57527286.js` → `CrossingOverVisualization`.

#### Crowding out

Type `CROWDING_OUT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-79cf31a64566.js` → `Visualization`.

#### Crystal unit cells

Cubic unit-cell type

Type `CRYSTAL_UNIT_CELLS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-93a06cac6205.js` → `Visualization`.

#### Currency appreciation

Type `CURRENCY_APPRECIATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d256e0290032.js` → `CurrencyAppreciationVisualization`.

#### Current to magnetic field: `B = \frac{\mu_0 I}{2\pi r}`

Direction of current through the wire

Type `CURRENT_TO_MAGNETIC_FIELD` · manifest v3 · formula `B = \frac{\mu_0 I}{2\pi r}`.

Parameters: `currentDirection` (enum, default `up`, one of `up`, `down`); `currentStrengthAmperes` (number, default `5`, range 1 to 10).

Source: manifest `model-b39b238c2140.js`; view `visualization-eced1f49f56b.js` → `CurrentToMagneticFieldVisualization`.

#### Current to magnetic field direction

Conventional current upward

Type `CURRENT_TO_MAGNETIC_FIELD_DIRECTION` · manifest v1.

Parameters: `currentDirection` (enum, default `up`, one of `up`, `down`).

Source: manifest `type-8ea75e03943c.js`; view `visualization-c233667d37dd.js` → `CurrentToMagneticFieldDirectionVisualization`.

#### Cyclohexane chair flips

Substituted cyclohexane example

Type `CYCLOHEXANE_CHAIR_FLIPS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-412a533bad19.js` → `Visualization`.

#### Cylinder volume: `V = \pi r^2 h`

Type `CYLINDER_VOLUME` · manifest v3 · formula `V = \pi r^2 h`, also `V = \pi h r^2`, `\pi r^2 h = V`, `\pi h r^2 = V`, `h = \frac{V}{\pi r^2}`, `r^2 = \frac{V}{\pi h}`.

Parameters: `radius` (number, default `3`, range 0.01 to 10000); `height` (number, default `8`, range 0.01 to 10000).

Source: manifest `type-e93330f8f338.js`; view `visualization-d291a043dc05.js` → `CylinderVolumeVisualization`.

#### Dc circuit power: `P = VI`

Type `DC_CIRCUIT_POWER` · manifest v4 · formula `P = VI`.

Parameters: `voltageVolts` (number, default `12`, range 1 to 24); `resistanceOhms` (number, default `6`, range 1 to 24).

Source: manifest `type-81adbb1f028d.js`; view `visualization-164f536e6742.js` → `DcCircuitPowerVisualization`.

#### Decibel safety

Type `DECIBEL_SAFETY` · manifest v4.

Parameters: `sound_level_dba` (number, default `85`, range 82 to 100); `exposure_duration_minutes` (integer, default `480`, range 0 to 960).

Source: manifest `type-b72953d55796.js`; view `visualization-6a44213e96f9.js` → `Visualization`.

#### Decision tree classification path

Type `DECISION_TREE_CLASSIFICATION_PATH` · manifest v3.

Parameters: `x1` (number, default `5.5`, range 0 to 10); `x2` (number, default `3.5`, range 0 to 10).

Source: manifest `model-23fec778784f.js`; view `visualization-80fb41c9220d.js` → `DecisionTreeClassificationPathVisualization`.

#### Degree of unsaturation

Type `DEGREE_OF_UNSATURATION` · manifest v2.

Parameters: `example_formula` (enum, default `C6H10`, one of `C2H6`, `C4H8`, `C6H10`, `C6H6`, `C4H6Br2`, `C5H8O`, `C5H9N`).

Source: manifest `type-60f4e9362b4d.js`; view `visualization-6dff39efe331.js` → `DegreeOfUnsaturationVisualization`.

#### Dehydration synthesis vs hydrolysis

Reaction direction

Type `DEHYDRATION_SYNTHESIS_VS_HYDROLYSIS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-32bb5c853414.js` → `Visualization`.

#### Delta g k e relationship

Type `DELTA_G_K_E_RELATIONSHIP` · manifest v4.

Parameters: `standard_cell_potential_volts` (number, default `0.12`, range -0.3 to 0.3); `electrons_transferred` (integer, default `2`, range 1 to 6); `temperature_kelvin` (number, default `298.15`, range 250 to 400).

Source: manifest `model-873e0c320c3b.js`; view `visualization-758d2982cd2c.js` → `DeltaGKERelationshipVisualization`.

#### Demand curve

Type `DEMAND_CURVE` · manifest v3.

Parameters: `price` (number, default `5`, range 1 to 9); `demand_shift` (number, default `0`, range -1 to 1).

Source: manifest `type-759e4fab0713.js`; view `visualization-255112b74daf.js` → `Visualization`.

#### Demand elasticity

Demand responsiveness

Type `DEMAND_ELASTICITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-866a660c41a8.js` → `Visualization`.

#### Demand shock

Type `DEMAND_SHOCK`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-86da03f72a7f.js` → `DemandShockVisualization`.

#### Denial of service overload

Request flow animation

Type `DENIAL_OF_SERVICE_OVERLOAD` · manifest v5.

Parameters: `server_capacity` (integer, default `120`, range 100 to 300); `legitimate_request_rate` (integer, default `40`, range 10 to 80).

Source: manifest `type-253ef788d0bb.js`; view `visualization-f4d0dcf75d18.js` → `Visualization`.

#### Density dependence

Current population density index

Type `DENSITY_DEPENDENCE` · manifest v2.

Parameters: `carrying_capacity` (integer, default `100`, range 40 to 200); `intrinsic_growth_rate` (number, default `0.4`, range 0.1 to 0.8).

Source: manifest `model-43a9f02da387.js`; view `visualization-48436c5b91db.js` → `DensityDependenceVisualization`.

#### Derivative

Type `DERIVATIVE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6350c2fb386a.js` → `DerivativeVisualization`.

#### Derivative as secant: `f'(a)=\lim_{h\to0^+}\frac{f(a+h)-f(a)}{h}`

Positive horizontal change h from P to Q

Type `DERIVATIVE_AS_SECANT` · manifest v3 · formula `f'(a)=\lim_{h\to0^+}\frac{f(a+h)-f(a)}{h}`.

Parameters: `functionExpression` (enum, default `x^2`, one of `x^2`, `x^3`, `x^3-x`, `sin(x)`, `cos(x)`, `e^x`); `xValue` (number, default `1`, range -10 to 10); `h` (number, default `2`, range 0.05 to 4).

Source: manifest `type-b5036e205e38.js`; view `visualization-9b021a46bba8.js` → `DerivativeAsSecantVisualization`.

#### Derivative product rule: `(fg)' = f'g + fg'`

Type `DERIVATIVE_PRODUCT_RULE` · manifest v2 · formula `(fg)' = f'g + fg'`.

Parameters: `deltaX` (number, default `2`, range 0.05 to 2).

Source: manifest `type-3f3e34153e7c.js`; view `visualization-8c7efb084b72.js` → `DerivativeProductRuleVisualization`.

#### Detergent micelle grease

Relative detergent amount

Type `DETERGENT_MICELLE_GREASE` · manifest v4.

Parameters: `relativeDetergentAmountPercent` (number, default `40`, range 0 to 100).

Source: manifest `model-94e102697f8c.js`; view `visualization-809dec3988a7.js` → `DetergentMicelleGreaseVisualization`.

#### Dice rolling

Type `DICE_ROLLING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-fbfd098e1960.js` → `DiceRollingVisualization`.

#### Dichotomous key

Type `DICHOTOMOUS_KEY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-29423f03bfa8.js` → `DichotomousKeyVisualization`.

#### Difference in differences: `\widehat{\tau}_{DiD} = \Delta Y_T - \Delta Y_C`

Type `DIFFERENCE_IN_DIFFERENCES` · manifest v3 · formula `\widehat{\tau}_{DiD} = \Delta Y_T - \Delta Y_C`.

Parameters: `treated_pre_outcome` (number, default `60`, range 20 to 80); `control_pre_outcome` (number, default `40`, range 20 to 80); `common_change` (number, default `8`, range -15 to 15); `treatment_effect` (number, default `14`, range -20 to 20).

Source: manifest `type-62bcf9304582.js`; view `visualization-c62764914274.js` → `Visualization`.

#### Difference of squares

Type `DIFFERENCE_OF_SQUARES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-14a0ca2baec2.js` → `DifferenceOfSquaresVisualization`.

#### Diffusion

Type `DIFFUSION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-893019a59f76.js` → `DiffusionVisualization`.

#### Digestive tract absorption

Nutrient to trace

Type `DIGESTIVE_TRACT_ABSORPTION` · manifest v2.

Parameters: `nutrient` (enum, default `carbohydrate`, one of `carbohydrate`, `protein`, `long-chain fat`).

Source: manifest `model-7f8b73e7da12.js`; view `visualization-b4f84dc887ba.js` → `DigestiveTractAbsorptionVisualization`.

#### Dijkstra shortest path

Type `DIJKSTRA_SHORTEST_PATH`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d6d7ee0a0f96.js` → `DijkstraShortestPathVisualization`.

#### Diminishing marginal returns

Type `DIMINISHING_MARGINAL_RETURNS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ab11fc608061.js` → `MarginalProductVisualization`.

#### Diminishing marginal utility

Marginal and total utility graph. {quantity, plural, =0 {No units are selected} one {Unit 1 contributes {marginal, number} utility} other {Unit {quantity, number} contributes {marginal, number} utility}}; total utility is {total, number}. Marginal utility falls with each unit, while total utility rises more slowly, levels off, and eventually falls.

Type `DIMINISHING_MARGINAL_UTILITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7bf865d71fa8.js` → `Visualization`.

#### Direct inverse proportion

Type `DIRECT_INVERSE_PROPORTION` · manifest v4.

Parameters: `x` (number, default `1`, range 0.5 to 2.5).

Source: manifest `type-bd43c0bf82aa.js`; view `visualization-18bad604d20c.js` → `DirectInverseProportionVisualization`.

#### Discrete event queue simulation

Arrival pattern

Type `DISCRETE_EVENT_QUEUE_SIMULATION` · manifest v4.

Parameters: `workload` (enum, default `bursty`, one of `spaced`, `bursty`).

Source: manifest `type-178545bdd851.js`; view `visualization-2cce5d219394.js` → `DiscreteEventQueueSimulationVisualization`.

#### Discriminant

Type `DISCRIMINANT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a9ca001b4b23.js` → `DiscriminantVisualization`.

#### Dissolution

Dissolution stage

Type `DISSOLUTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-fd9ffb2677a3.js` → `Visualization`.

#### Distance formula

Type `DISTANCE_FORMULA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f37c4b30df9d.js` → `DistanceFormulaVisualization`.

#### Distance traveled vs displacement

Type `DISTANCE_TRAVELED_VS_DISPLACEMENT` · manifest v2.

Parameters: `route` (enum, default `detour`, one of `direct`, `detour`, `round_trip`).

Source: manifest `model-3fc8a8edee3e.js`; view `visualization-deb9070fe5d9.js` → `DistanceTraveledVsDisplacementVisualization`.

#### Distillation

Distillation stage

Type `DISTILLATION` · manifest v5.

Parameters: `mixture_example` (enum, default `salt water`, one of `salt water`, `colored solution`, `widely separated liquids`).

Source: manifest `model-a11bd7ff405e.js`; view `visualization-a6f31fe94204.js` → `DistillationVisualization`.

#### Distributive property: `a(b+c)=ab+ac`

Type `DISTRIBUTIVE_PROPERTY` · manifest v2 · formula `a(b+c)=ab+ac`.

Parameters: `a` (integer, default `8`, range 2 to 8); `b` (integer, default `7`, range 2 to 8); `c` (integer, default `7`, range 2 to 8).

Source: manifest `type-50c9fc73ec1d.js`; view `visualization-c4dec9ca8a69.js` → `DistributivePropertyVisualization`.

#### Divide conquer recurrence tree

Choose recurrence example

Type `DIVIDE_CONQUER_RECURRENCE_TREE` · manifest v1.

Parameters: `recurrence_example` (enum, default `T(n) = 2T(n/2) + n`, one of `T(n) = 2T(n/2) + 1`, `T(n) = 2T(n/2) + n`, `T(n) = 2T(n/2) + n^2`).

Source: manifest `type-603f86db5a64.js`; view `visualization-a89de7f4dbca.js` → `DivideConquerRecurrenceTreeVisualization`.

#### Dna gel fragment migration

Type `DNA_GEL_FRAGMENT_MIGRATION` · manifest v2.

Parameters: `runTimeMinutes` (integer, default `18`, range 1 to 40); `fragmentSizeBasePairs` (integer, default `700`, range 100 to 2000).

Source: manifest `type-72629e85a720.js`; view `visualization-dc2df92dcbcf.js` → `DnaGelFragmentMigrationVisualization`.

#### Dna replication fork

Type `DNA_REPLICATION_FORK`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d640a7409963.js` → `DnaReplicationForkVisualization`.

#### Dna transcription

Type `DNA_TRANSCRIPTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4b59f31925d9.js` → `DnaTranscriptionVisualization`.

#### Dns resolution

Cache miss: follow the nameserver hierarchy

Type `DNS_RESOLUTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f6e85e9b2f44.js` → `DnsResolutionVisualization`.

#### Doppler effect

Type `DOPPLER_EFFECT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-e4df31ac1117.js` → `DopplerEffectVisualization`.

#### Dose response curve

Potency shift: same efficacy, different potency

Type `DOSE_RESPONSE_CURVE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d19f0cf9bff9.js` → `DoseResponseVisualization`.

#### Dot plot

Data set

Type `DOT_PLOT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ce981509024b.js` → `DotPlotVisualization`.

#### Double entry transaction effects

Type `DOUBLE_ENTRY_TRANSACTION_EFFECTS` · manifest v3.

Parameters: `transaction_type` (enum, default `owner investment for cash`, one of `owner investment for cash`, `equipment purchase for cash`, `supplies purchase on account`, `payment of accounts payable`).

Source: manifest `model-2922d86b57c4.js`; view `visualization-58d153270eb3.js` → `DoubleEntryTransactionEffectsVisualization`.

#### Double fertilization

Double-fertilization stage

Type `DOUBLE_FERTILIZATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-14a30f3d18ca.js` → `Visualization`.

#### Drum grid notation

Choose eighth-note or sixteenth-note subdivision

Type `DRUM_GRID_NOTATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-32161efbf67d.js` → `DrumGridNotationVisualization`.

#### Dynamic equilibrium

Reactant-rich start

Type `DYNAMIC_EQUILIBRIUM`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-79440bc6ddd1.js` → `Visualization`.

#### Dynamics and articulation

Type `DYNAMICS_AND_ARTICULATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-37114bfcd18c.js` → `Visualization`.

#### Earth layers and convection

Mantle-convection stage

Type `EARTH_LAYERS_AND_CONVECTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-e7e60d80016f.js` → `Visualization`.

#### Ecological footprint

Type `ECOLOGICAL_FOOTPRINT` · manifest v5.

Parameters: `focus_year` (integer, default `2014`, range 1961 to 2014).

Source: manifest `type-e177a5957273.js`; view `visualization-b1ccdf1eff2a.js` → `EcologicalFootprintVisualization`.

#### Ecological succession stages

Stage {number, number}: {stage}

Type `ECOLOGICAL_SUCCESSION_STAGES` · manifest v2.

Parameters: `successionType` (enum, default `primary`, one of `primary`, `secondary`).

Source: manifest `model-f721c5cf751c.js`; view `visualization-c03ad98f2da1.js` → `EcologicalSuccessionVisualization`.

#### Ecological tolerance curve

Relative {factor} condition from low to high

Type `ECOLOGICAL_TOLERANCE_CURVE` · manifest v3.

Parameters: `environmental_factor` (enum, default `temperature`, one of `temperature`, `salinity`, `pH`, `dissolved oxygen`, `moisture`).

Source: manifest `model-d1b5eccccd13.js`; view `visualization-a53eff6f0b00.js` → `EcologicalToleranceCurveVisualization`.

#### Economic externalities

Type `ECONOMIC_EXTERNALITIES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a39d714c13f1.js` → `NegativeExternalityVisualization`.

#### Economic order quantity

Type `ECONOMIC_ORDER_QUANTITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a52e9d0f247b.js` → `EconomicOrderQuantityVisualization`.

#### Economies of scale

Type `ECONOMIES_OF_SCALE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-69a5b6abd033.js` → `LongRunAtcVisualization`.

#### Eigendirections: `A\mathbf{v}=\lambda\mathbf{v}`

Type `EIGENDIRECTIONS` · manifest v3 · formula `A\mathbf{v}=\lambda\mathbf{v}`.

Parameters: `a11` (number, default `2`, range -2 to 2); `a12` (number, default `1`, range -2 to 2); `a21` (number, default `1`, range -2 to 2); `a22` (number, default `2`, range -2 to 2).

Source: manifest `type-9dd1c641b080.js`; view `visualization-ce29ec0064a2.js` → `EigendirectionsVisualization`.

#### Ekg parts

Type `EKG_PARTS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-fc9617153403.js` → `EkgPartsVisualization`.

#### El nino and la nina

Type `EL_NINO_AND_LA_NINA` · manifest v2.

Parameters: `initial_phase` (enum, default `Neutral`, one of `La Niña`, `Neutral`, `El Niño`).

Source: manifest `type-44fc1ec684df.js`; view `visualization-444b216041ec.js` → `ElNinoAndLaNinaVisualization`.

#### Elasticity total revenue

Price

Type `ELASTICITY_TOTAL_REVENUE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-be322dbf4bcc.js` → `ElasticityTotalRevenueVisualization`.

#### Electric current charge flow: `I = \frac{Q}{t}`

Type `ELECTRIC_CURRENT_CHARGE_FLOW` · manifest v3 · formula `I = \frac{Q}{t}`.

Parameters: `packetRatePerSecond` (number, default `4`, range 1 to 8); `chargePerPacketCoulombs` (number, default `1`, range 0.5 to 3).

Source: manifest `type-dcb1b5569c53.js`; view `visualization-2c6f4e168452.js` → `ElectricCurrentChargeFlowVisualization`.

#### Electric field: `E\propto\frac{1}{r^2}`

Type `ELECTRIC_FIELD` · manifest v3 · formula `E\propto\frac{1}{r^2}`.

Parameters: `polarity` (enum, default `positive`, one of `positive`, `negative`).

Source: manifest `model-51dd0b398611.js`; view `visualization-2ea08dd34d3e.js` → `ElectricFieldVisualization`.

#### Electric field multiple charges

Type `ELECTRIC_FIELD_MULTIPLE_CHARGES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-604f783d6fdb.js` → `ElectricFieldMultipleChargesVisualization`.

#### Electric flux flat surface: `\Phi_E = EA\cos(\theta)`

Electric field magnitude

Type `ELECTRIC_FLUX_FLAT_SURFACE` · manifest v2 · formula `\Phi_E = EA\cos(\theta)`.

Parameters: `fieldStrengthNewtonsPerCoulomb` (number, default `6`, range 0 to 10); `areaSquareMeters` (number, default `3`, range 0.5 to 5); `angleDegrees` (number, default `30`, range 0 to 90).

Source: manifest `type-8d1ac0d714c4.js`; view `visualization-1a953d4677e1.js` → `ElectricFluxFlatSurfaceVisualization`.

#### Electrical resistance factors

Type `ELECTRICAL_RESISTANCE_FACTORS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d239cad2e010.js` → `ElectricalResistanceFactorsVisualization`.

#### Electrolyte conductivity

{solution}, {strength}

Type `ELECTROLYTE_CONDUCTIVITY` · manifest v3.

Parameters: `initial_solution` (enum, default `potassium-chloride`, one of `potassium-chloride`, `acetic-acid`, `ethanol`); `initial_concentration` (number, default `0.6`, range 0.1 to 1).

Source: manifest `type-ba543fe66918.js`; view `visualization-3bbc1346301d.js` → `ElectrolyteConductivityVisualization`.

#### Electrolytic cell

Type `ELECTROLYTIC_CELL` · manifest v2.

Parameters: `electrolyte` (enum, default `molten sodium chloride`, one of `molten sodium chloride`, `molten lead(II) bromide`).

Source: manifest `model-ffbb570f1ec8.js`; view `visualization-e312cac72dd7.js` → `Visualization`.

#### Electromagnetic spectrum

Electromagnetic band

Type `ELECTROMAGNETIC_SPECTRUM` · manifest v1.

Parameters: `focus_band` (enum, default `visible`, one of `radio`, `microwave`, `infrared`, `visible`, `ultraviolet`, `x-ray`, `gamma-ray`).

Source: manifest `model-e044398b5fd7.js`; view `visualization-b5a488698d73.js` → `ElectromagneticSpectrumVisualization`.

#### Electron orbital filling

Type `ELECTRON_ORBITAL_FILLING` · manifest v3.

Parameters: `atomicNumber` (integer, default `10`, range 1 to 36).

Source: manifest `model-b586e91ccccc.js`; view `visualization-828fa2acdfa6.js` → `ElectronOrbitalFillingVisualization`.

#### Element vs compound vs mixture

Particle sample

Type `ELEMENT_VS_COMPOUND_VS_MIXTURE` · manifest v2.

Parameters: `initial_sample` (enum, default `monatomic element`, one of `monatomic element`, `diatomic element`, `molecular compound`, `mixture of elements`, `mixture of element and compound`, `mixture of compounds`).

Source: manifest `type-ea91da6d3b05.js`; view `visualization-f2eea71668c7.js` → `Visualization`.

#### Elementary row operations: `\left[A\mid\mathbf{b}\right]\sim\left[I\mid\mathbf{x}\right]`

Gaussian elimination step

Type `ELEMENTARY_ROW_OPERATIONS` · manifest v1 · formula `\left[A\mid\mathbf{b}\right]\sim\left[I\mid\mathbf{x}\right]`.

Parameters: `solutionX` (number, default `1`, range -2 to 2); `solutionY` (number, default `2`, range -2 to 2).

Source: manifest `model-41a7cd3908a8.js`; view `visualization-594d3a5cc009.js` → `ElementaryRowOperationsVisualization`.

#### Empirical rule

Within {count, plural, one {# standard deviation} other {# standard deviations}}

Type `EMPIRICAL_RULE` · manifest v4.

Parameters: `mean` (number, default `100`, range -10000 to 10000); `standard_deviation` (number, default `15`, range 0.1 to 3000).

Source: manifest `model-8bc3f47e8528.js`; view `visualization-e6034fc7bcae.js` → `EmpiricalRuleVisualization`.

#### Empirical vs molecular formula

Type `EMPIRICAL_VS_MOLECULAR_FORMULA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f03804083ee8.js` → `Visualization`.

#### Endocrine feedback axis

Peripheral-hormone state

Type `ENDOCRINE_FEEDBACK_AXIS` · manifest v3.

Parameters: `axis` (enum, default `thyroid`, one of `thyroid`, `adrenal`).

Source: manifest `model-5a5542c48ccf.js`; view `visualization-8053e1c6cfdf.js` → `Visualization`.

#### Endocytosis and exocytosis

Transport stage

Type `ENDOCYTOSIS_AND_EXOCYTOSIS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-344531afc98d.js` → `Visualization`.

#### Endomembrane pathway

Cargo destination

Type `ENDOMEMBRANE_PATHWAY` · manifest v2.

Parameters: `cargo_destination` (enum, default `secretion`, one of `secretion`, `plasma membrane`, `lysosome`).

Source: manifest `model-6d0fe1644e34.js`; view `visualization-b5a7b328cd77.js` → `Visualization`.

#### Energy coupling

ATP cycle path

Type `ENERGY_COUPLING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ad88b1768daf.js` → `EnergyCouplingVisualization`.

#### Energy efficiency sankey diagram: `\text{Efficiency}=\frac{\text{useful output}}{\text{total input}}`

Change the percentage of input energy transferred usefully

Type `ENERGY_EFFICIENCY_SANKEY_DIAGRAM` · manifest v2 · formula `\text{Efficiency}=\frac{\text{useful output}}{\text{total input}}`.

Parameters: `energy_system` (enum, default `light bulb`, one of `light bulb`, `electric motor`, `car engine`); `input_energy_joules` (number, default `100`, range 1 to 10000); `initial_efficiency_percent` (number, default `40`, range 0 to 100).

Source: manifest `type-c20db913b337.js`; view `visualization-efbe6579350d.js` → `EnergyEfficiencySankeyVisualization`.

#### Enthalpy: `\Delta H = H_{\mathrm{products}} - H_{\mathrm{reactants}}`

Type `ENTHALPY` · manifest v4 · formula `\Delta H = H_{\mathrm{products}} - H_{\mathrm{reactants}}`.

Parameters: `enthalpyChangeKilojoules` (number, default `-50`, range -100 to 100).

Source: manifest `model-c5cda5a90fb9.js`; view `visualization-db5d5367e3fa.js` → `EnthalpyVisualization`.

#### Entropy and dispersal

Type `ENTROPY_AND_DISPERSAL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a6675ce989b3.js` → `Visualization`.

#### Enzyme and temperature

Type `ENZYME_AND_TEMPERATURE` · manifest v4.

Parameters: `temperatureCelsius` (number, default `25`, range 0 to 70).

Source: manifest `model-f5d8a0ad0545.js`; view `visualization-6a88c3933dd8.js` → `EnzymeAndTemperatureVisualization`.

#### Enzyme inhibition rate effects

Relative substrate concentration

Type `ENZYME_INHIBITION_RATE_EFFECTS` · manifest v4.

Parameters: `relativeSubstrateConcentration` (number, default `2`, range 0 to 10); `inhibitorLevel` (enum, default `low`, one of `none`, `low`, `high`).

Source: manifest `model-7ecafb9fbe11.js`; view `visualization-ba80a636fcd2.js` → `EnzymeInhibitionRateEffectsVisualization`.

#### Enzyme lock key cycle

Type `ENZYME_LOCK_KEY_CYCLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1f1021503ac6.js` → `EnzymeLockKeyCycleVisualization`.

#### Epigenetics

Chromatin state

Type `EPIGENETICS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d8b7fb0f4d1f.js` → `Visualization`.

#### Epsp ipsp summation

Type `EPSP_IPSP_SUMMATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-50c5d957847b.js` → `EpspIpspSummationVisualization`.

#### Eq curve

Center frequency in hertz

Type `EQ_CURVE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-86eebf863d19.js` → `Visualization`.

#### Equilateral triangle

Type `EQUILATERAL_TRIANGLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-57f734a53dfe.js` → `EquilateralTriangleVisualization`.

#### Equilibrium concentration graph

Species added at equilibrium

Type `EQUILIBRIUM_CONCENTRATION_GRAPH` · manifest v3.

Parameters: `equilibrium_constant` (number, default `2`, range 0.25 to 4); `initial_total_concentration` (number, default `1`, range 0.5 to 2).

Source: manifest `model-0b71968a76c7.js`; view `visualization-df8601b859b2.js` → `EquilibriumConcentrationVisualization`.

#### Er diagram relational tables

ER mapping stage

Type `ER_DIAGRAM_RELATIONAL_TABLES` · manifest v2.

Parameters: `relationship_kind` (enum, default `one-to-many`, one of `one-to-one`, `one-to-many`, `many-to-many`); `include_relationship_attribute` (boolean, default `true`).

Source: manifest `model-b729a24f3575.js`; view `visualization-99b0e7509573.js` → `ErDiagramVisualization`.

#### Eukaryotic gene regulation

Chromatin accessibility

Type `EUKARYOTIC_GENE_REGULATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-322d586353e1.js` → `Visualization`.

#### Euler formula

Type `EULER_FORMULA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3637e4984f5d.js` → `EulerFormulaVisualization`.

#### Eutrophication

Type `EUTROPHICATION` · manifest v2.

Parameters: `waterBody` (enum, default `freshwater lake`, one of `freshwater lake`, `estuary`, `coastal bay`).

Source: manifest `model-6d7b03cccde0.js`; view `visualization-5fd2a84c63a0.js` → `EutrophicationVisualization`.

#### Evaporation rate factors

Particle attraction strength

Type `EVAPORATION_RATE_FACTORS` · manifest v1.

Parameters: `temperatureCelsius` (number, default `25`, range 10 to 60); `surfaceAreaPercent` (number, default `60`, range 25 to 100); `airflowMetersPerSecond` (number, default `1`, range 0 to 3); `humidityPercent` (number, default `40`, range 0 to 100); `attraction` (enum, default `medium`, one of `weak`, `medium`, `strong`).

Source: manifest `type-119bdab76cbe.js`; view `visualization-ea096d43467a.js` → `EvaporationRateFactorsVisualization`.

#### Even odd function symmetry

Type `EVEN_ODD_FUNCTION_SYMMETRY` · manifest v3.

Parameters: `symmetryType` (enum, default `even`, one of `even`, `odd`, `neither`); `x` (number, default `3`, range 1.25 to 4.5).

Source: manifest `model-4d3238eeddf7.js`; view `visualization-77361f7067ca.js` → `EvenOddFunctionSymmetryVisualization`.

#### Expected value weighted average

Type `EXPECTED_VALUE_WEIGHTED_AVERAGE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-e5f771d10aa6.js` → `ExpectedValueWeightedAverageVisualization`.

#### Exponent laws repeated multiplication

Type `EXPONENT_LAWS_REPEATED_MULTIPLICATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-5acdcea37f29.js` → `ExponentLawsRepeatedMultiplicationVisualization`.

#### Exponential decay: `y = e^{-kt}`

Type `EXPONENTIAL_DECAY` · manifest v4 · formula `y = e^{-kt}`, also `y = y_0 \exp(-kt)`, `y = e^{-t}`, `y = 2e^{-0.5t}`, `N = N_0 e^{-\lambda t}`, `A = A_0 e^{-\lambda t}`.

Parameters: `initial` (number, default `6`, range 0.01 to 10000); `decay` (number, default `0.6`, range 0.01 to 10000).

Source: manifest `type-33f0d487d38b.js`; view `visualization-31a00dfed970.js` → `ExponentialDecayVisualization`.

#### Exponential distribution: `f(t)=\lambda e^{-\lambda t},\quad t\ge 0`

Constant event rate

Type `EXPONENTIAL_DISTRIBUTION` · manifest v3 · formula `f(t)=\lambda e^{-\lambda t},\quad t\ge 0`.

Parameters: `rate` (number, default `0.5`, range 0.25 to 1); `waiting_time` (number, default `5`, range 0 to 12).

Source: manifest `model-1f7a57227d2e.js`; view `visualization-69f5eaa70089.js` → `ExponentialDistributionVisualization`.

#### Exports

Type `EXPORTS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-337e72fc14df.js` → `ExportsVisualization`.

#### Eye accommodation

Type `EYE_ACCOMMODATION` · manifest v1.

Parameters: `objectDistanceMeters` (number, default `1`, range 0.25 to 6).

Source: manifest `type-42a870b7bbdb.js`; view `visualization-5a966e17fa94.js` → `EyeAccommodationVisualization`.

#### Eye prescription

Sphere power in diopters

Type `EYE_PRESCRIPTION` · manifest v1.

Parameters: `sphereDiopters` (number, default `2.5`, range -10 to 10); `cylinderDiopters` (number, default `-0.5`, range -6 to 6); `axisDegrees` (number, default `135`, range 0 to 180).

Source: manifest `type-ba89e7f5dcc4.js`; view `visualization-f6acb40846c6.js` → `EyePrescriptionVisualization`.

#### Factor pairs arrays

Rows in the array

Type `FACTOR_PAIRS_ARRAYS` · manifest v1.

Parameters: `wholeNumber` (integer, default `24`, range 1 to 36).

Source: manifest `model-b7e30c22fb74.js`; view `visualization-1322ba419af5.js` → `FactorPairsArraysVisualization`.

#### Fahrenheit celsius scale: `F = \frac{9}{5}C + 32`

{landmark}, {valueCount, plural, one {{value} degree Celsius} other {{value} degrees Celsius}}

Type `FAHRENHEIT_CELSIUS_SCALE` · manifest v1 · formula `F = \frac{9}{5}C + 32`.

Parameters: `celsius` (number, default `0`, range -40 to 120).

Source: manifest `type-7ff60fd7b3ba.js`; view `visualization-277e8f81e6ba.js` → `FahrenheitCelsiusScaleVisualization`.

#### Faradays law electrolysis: `m=\frac{MQ}{zF},\quad Q=It`

Total charge passed

Type `FARADAYS_LAW_ELECTROLYSIS` · manifest v4 · formula `m=\frac{MQ}{zF},\quad Q=It`.

Parameters: `electrolyte` (enum, default `silver nitrate`, one of `silver nitrate`, `copper(II) sulfate`).

Source: manifest `model-a414c3bf04d3.js`; view `visualization-3fd8c587056e.js` → `Visualization`.

#### Fatty acid saturation

Type `FATTY_ACID_SATURATION` · manifest v1.

Parameters: `doubleBonds` (integer, default `1`, range 0 to 3); `temperatureCelsius` (number, default `20`, range 0 to 50).

Source: manifest `model-a41a580621d5.js`; view `visualization-c1d8a1c05dd5.js` → `FattyAcidSaturationVisualization`.

#### Fermentation

Fermentation route

Type `FERMENTATION` · manifest v2.

Parameters: `fermentation_type` (enum, default `lactic acid`, one of `lactic acid`, `alcohol`).

Source: manifest `model-e9d1e1169b7a.js`; view `visualization-2d9c86f82a60.js` → `FermentationVisualization`.

#### Fifo lifo cost flow

Type `FIFO_LIFO_COST_FLOW` · manifest v1.

Parameters: `unitsSold` (integer, default `180`, range 0 to 300); `priceTrend` (enum, default `rising`, one of `falling`, `flat`, `rising`).

Source: manifest `model-8ce870eed550.js`; view `visualization-b99092e290ef.js` → `FifoLifoCostFlowVisualization`.

#### Filling rates: `r_{\mathrm{net}}=r_{\mathrm{in}}-r_{\mathrm{out}}`

Type `FILLING_RATES` · manifest v2 · formula `r_{\mathrm{net}}=r_{\mathrm{in}}-r_{\mathrm{out}}`.

Parameters: `inflowRateLitersPerMinute` (number, default `6`, range 0 to 8); `outflowRateLitersPerMinute` (number, default `2`, range 0 to 8).

Source: manifest `type-33d5b92afbca.js`; view `visualization-2c515027f1c2.js` → `FillingRatesVisualization`.

#### Filtration

Starting mixture

Type `FILTRATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a4abe8fdef51.js` → `Visualization`.

#### Finite state machine

Type `FINITE_STATE_MACHINE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f21bb253c202.js` → `FiniteStateMachineVisualization`.

#### Fire triangle fire tetrahedron

Fire diagram

Type `FIRE_TRIANGLE_FIRE_TETRAHEDRON`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-5a71020f4df2.js` → `Visualization`.

#### Firm cost curves

Selected output quantity

Type `FIRM_COST_CURVES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-dc777446ef83.js` → `FirmCostCurvesVisualization`.

#### First order ode

Initial value y at x equals {initialX}

Type `FIRST_ORDER_ODE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-344c6d1da929.js` → `FirstOrderOdeVisualization`.

#### Fiscal policy

Type `FISCAL_POLICY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-51e92319920a.js` → `FiscalPolicyVisualization`.

#### Fisheries and maximum sustainable yield

Fishing effort index

Type `FISHERIES_AND_MAXIMUM_SUSTAINABLE_YIELD`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d16cc090126d.js` → `FisheriesAndMaximumSustainableYieldVisualization`.

#### Fitness and adaptation

Selective environment

Type `FITNESS_AND_ADAPTATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-04a6175d44ae.js` → `FitnessAndAdaptationVisualization`.

#### Fixed perimeter rectangle area: `A = w \times h`

Type `FIXED_PERIMETER_RECTANGLE_AREA` · manifest v2 · formula `A = w \times h`.

Parameters: `width` (number, default `4`, range 1 to 11).

Source: manifest `model-b128078a1c67.js`; view `visualization-b2a5e4ed3cc1.js` → `FixedPerimeterRectangleAreaVisualization`.

#### Fixed ratio scaling

Type `FIXED_RATIO_SCALING` · manifest v3.

Parameters: `scaleFactor` (number, default `1.5`, range 0.5 to 2).

Source: manifest `type-6d69838b61ac.js`; view `visualization-8d99b09c9409.js` → `FixedRatioScalingVisualization`.

#### Flower pollination

Pollination type

Type `FLOWER_POLLINATION` · manifest v2.

Parameters: `pollination_type` (enum, default `cross-pollination`, one of `self-pollination`, `cross-pollination`).

Source: manifest `model-eed880ff8885.js`; view `visualization-56d128033141.js` → `FlowerPollinationVisualization`.

#### Fluid mosaic membrane

Type `FLUID_MOSAIC_MEMBRANE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-456ade94d0e4.js` → `Visualization`.

#### Foil binomial

Type `FOIL_BINOMIAL` · manifest v2.

Parameters: `a` (number, default `1`, range -12 to 12); `b` (number, default `3`, range -12 to 12); `c` (number, default `1`, range -12 to 12); `d` (number, default `2`, range -12 to 12).

Source: manifest `type-49e9f66a2d98.js`; view `visualization-59d30fdc5846.js` → `FoilBinomialVisualization`.

#### Food chain

Trace the food chain

Type `FOOD_CHAIN` · manifest v4.

Parameters: `ecosystem` (enum, default `grassland`, one of `grassland`, `pond`, `ocean`).

Source: manifest `model-b3392fd69f76.js`; view `visualization-cb953880ad77.js` → `Visualization`.

#### Food web

Food-chain path

Type `FOOD_WEB` · manifest v1.

Parameters: `ecosystem` (enum, default `terrestrial`, one of `terrestrial`, `freshwater`, `marine`).

Source: manifest `model-c8be72ed6ac0.js`; view `visualization-186a8dfb5fe2.js` → `FoodWebVisualization`.

#### Foreign exchange market

Type `FOREIGN_EXCHANGE_MARKET`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-028919f8f68e.js` → `Visualization`.

#### Forestry methods

Regeneration method

Type `FORESTRY_METHODS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1d10147dd5af.js` → `Visualization`.

#### Formal charge

Structure {structure}, atom {position}, {element}

Type `FORMAL_CHARGE` · manifest v3.

Parameters: `example` (enum, default `carbon-dioxide-candidates`, one of `carbon-dioxide-candidates`, `nitrite-resonance`, `ammonium`).

Source: manifest `type-23b0e0e9a23b.js`; view `visualization-c033a489d5ec.js` → `FormalChargeVisualization`.

#### Fossil fuel formation

Fuel pathway

Type `FOSSIL_FUEL_FORMATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3f90b88a2104.js` → `FossilFuelFormationVisualization`.

#### Founder effect and bottleneck

Chance-sampling event

Type `FOUNDER_EFFECT_AND_BOTTLENECK`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-aa57e1438bc8.js` → `Visualization`.

#### Four to one multiplexer

Type `FOUR_TO_ONE_MULTIPLEXER` · manifest v2.

Parameters: `input0` (boolean, default `false`); `input1` (boolean, default `true`); `input2` (boolean, default `false`); `input3` (boolean, default `true`); `select1` (boolean, default `false`); `select0` (boolean, default `true`).

Source: manifest `model-85aa75328d7c.js`; view `visualization-ec88011df1e0.js` → `FourToOneMultiplexerVisualization`.

#### Fractions number line

Type `FRACTIONS_NUMBER_LINE` · manifest v2.

Parameters: `numerator` (integer, default `7`, range 0 to 36); `denominator` (integer, default `4`, range 2 to 12).

Source: manifest `model-e01a7cfd8d48.js`; view `visualization-3e201611d929.js` → `FractionsNumberLineVisualization`.

#### Free fall: `h(t) = h_0 + v_0t - \frac{1}{2}gt^2`

Type `FREE_FALL` · manifest v2 · formula `h(t) = h_0 + v_0t - \frac{1}{2}gt^2`.

Parameters: `initialHeightMeters` (number, default `14`, range 4 to 18); `initialVelocityMetersPerSecond` (number, default `0`, range -8 to 8).

Source: manifest `type-f5876f848904.js`; view `visualization-736bca56c4d4.js` → `FreeFallVisualization`.

#### Freezing point depression: `\Delta T_f = iK_fm`

Solute molality in moles per kilogram of solvent

Type `FREEZING_POINT_DEPRESSION` · manifest v3 · formula `\Delta T_f = iK_fm`.

Parameters: `solvent` (enum, default `water`, one of `water`, `benzene`, `cyclohexane`).

Source: manifest `model-ebe02413f5a3.js`; view `visualization-7dba324fe354.js` → `FreezingPointDepressionVisualization`.

#### Frequency spectrum

Type `FREQUENCY_SPECTRUM`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-71277aa319d1.js` → `FrequencySpectrumVisualization`.

#### Function call stack

Program moment

Type `FUNCTION_CALL_STACK`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a8cb785377e3.js` → `FunctionCallStackVisualization`.

#### Function composition

Type `FUNCTION_COMPOSITION` · manifest v1.

Parameters: `input_value` (number, default `2`, range -10 to 10); `g_operation` (enum, default `add 2`, one of `add 2`, `multiply by 3`, `square`, `negate`); `f_operation` (enum, default `multiply by 3`, one of `add 2`, `multiply by 3`, `square`, `negate`); `composition_order` (enum, default `g_then_f`, one of `g_then_f`, `f_then_g`).

Source: manifest `type-08ab5fc42dc6.js`; view `visualization-4d64da9eec86.js` → `FunctionCompositionVisualization`.

#### Futures hedge locked revenue

Type `FUTURES_HEDGE_LOCKED_REVENUE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-365e89ff4c2f.js` → `FuturesHedgeLockedRevenueVisualization`.

#### Fx net exports ad

Type `FX_NET_EXPORTS_AD` · manifest v2.

Parameters: `currency_value` (number, default `1`, range -2 to 2).

Source: manifest `model-1bcf71fb73f9.js`; view `visualization-dc9a8556f059.js` → `FxNetExportsAdVisualization`.

#### Gains from trade

Good 1 produced

Type `GAINS_FROM_TRADE` · manifest v2.

Parameters: `production_wheat` (number, default `7`, range 5 to 9); `trade_rate` (number, default `1.6`, range 0.4 to 1.8).

Source: manifest `model-80ffe0775316.js`; view `visualization-64987f92ea73.js` → `GainsFromTradeVisualization`.

#### Galvanic cell

Galvanic-cell state

Type `GALVANIC_CELL` · manifest v2.

Parameters: `cell_pair` (enum, default `zinc-copper`, one of `zinc-copper`, `copper-silver`).

Source: manifest `type-448ce06dc011.js`; view `visualization-dca64783284b.js` → `Visualization`.

#### Gas solubility

Type `GAS_SOLUBILITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-2a94e53a4f36.js` → `GasSolubilityVisualization`.

#### Gaussian surface symmetry

Type `GAUSSIAN_SURFACE_SYMMETRY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-be5d72856f41.js` → `GaussianSurfaceSymmetryVisualization`.

#### Gay lussacs law: `\frac{P_1}{T_1}=\frac{P_2}{T_2}`

Pressure-temperature plot for the same sealed rigid gas sample. State 1 is {temperatureOneCount, plural, one {{temperatureOne} kelvin} other {{temperatureOne} kelvin}} and {pressureOneCount, plural, one {{pressureOne} kilopascal} other {{pressureOne} kilopascals}}. State 2 is {temperatureTwoCount, plural, one {{temperatureTwo} kelvin} other {{temperatureTwo} kelvin}} and {pressureTwoCount, plural, one {{pressureTwo} kilopascal} other {{pressureTwo} kilopascals}}. Volume and gas amount are fixed, so pressure changes in the same proportion as Kelvin temperature.

Type `GAY_LUSSACS_LAW` · manifest v4 · formula `\frac{P_1}{T_1}=\frac{P_2}{T_2}`.

Parameters: `initial_temperature_k` (number, default `300`, range 250 to 400); `initial_pressure_kpa` (number, default `100`, range 50 to 160).

Source: manifest `model-235829f7022e.js`; view `visualization-49c09332ad79.js` → `GayLussacsLawVisualization`.

#### Gcd

Rectangle side A, {value, plural, one {# unit} other {# units}}. Drag horizontally.

Type `GCD` · manifest v1.

Parameters: `first_number` (integer, default `18`, range 2 to 24); `second_number` (integer, default `12`, range 2 to 24).

Source: manifest `type-a2fa2066a9f8.js`; view `visualization-83dd4989dbee.js` → `GcdVisualization`.

#### Gcf lcm

Type `GCF_LCM` · manifest v1.

Parameters: not read (the manifest module could not be evaluated).

Source: manifest `type-85abad9fe0ea.js`; view `visualization-ff104988ed5b.js` → `GcfLcmVisualization`.

#### Gdp expenditure identity

Type `GDP_EXPENDITURE_IDENTITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-50093701d562.js` → `GdpExpenditureIdentityVisualization`.

#### Gdp value double counting

Type `GDP_VALUE_DOUBLE_COUNTING` · manifest v2.

Parameters: `countMode` (enum, default `sales`, one of `sales`, `valueAdded`).

Source: manifest `type-18452383754a.js`; view `visualization-34eedfc6961e.js` → `GdpValueDoubleCountingVisualization`.

#### Genetic drift

Type `GENETIC_DRIFT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d9d315701204.js` → `Visualization`.

#### Geometric distribution: `P(X=k)=p(1-p)^{k-1}`

Per-trial success probability p

Type `GEOMETRIC_DISTRIBUTION` · manifest v4 · formula `P(X=k)=p(1-p)^{k-1}`.

Parameters: `success_probability` (number, default `0.25`, range 0.05 to 0.8); `selected_trial` (integer, default `4`, range 1 to 16).

Source: manifest `model-435009a98def.js`; view `visualization-e22e9357845c.js` → `GeometricDistributionVisualization`.

#### Geometric series

First term {variable}

Type `GEOMETRIC_SERIES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-45e1d3f602ce.js` → `GeometricSeriesVisualization`.

#### Geothermal power

Type `GEOTHERMAL_POWER` · manifest v4.

Parameters: `plant_type` (enum, default `dry steam`, one of `dry steam`, `flash steam`, `binary cycle`).

Source: manifest `model-f5fc9c2ff44e.js`; view `visualization-311c1d6d2814.js` → `GeothermalPowerVisualization`.

#### Ghk membrane potential: `P_{\mathrm{ion}}\uparrow \Rightarrow V_m \to E_{\mathrm{ion}}`

Sodium-to-potassium permeability ratio

Type `GHK_MEMBRANE_POTENTIAL` · manifest v1 · formula `P_{\mathrm{ion}}\uparrow \Rightarrow V_m \to E_{\mathrm{ion}}`.

Parameters: `sodiumToPotassiumPermeabilityRatio` (number, default `0.04`, range 0 to 1); `chlorideToPotassiumPermeabilityRatio` (number, default `0.45`, range 0 to 1).

Source: manifest `type-b2f3bbb776a0.js`; view `visualization-20e98de0b326.js` → `GhkMembranePotentialVisualization`.

#### Gibbs free energy: `\Delta G^\circ=-RT\ln K`

Type `GIBBS_FREE_ENERGY` · manifest v3 · formula `\Delta G^\circ=-RT\ln K`, also `\Delta_{\mathrm r}G^\circ=-RT\ln K`.

Parameters: `deltaGKilojoulesPerMole` (number, default `-20`, range -50 to 50).

Source: manifest `type-7d87631529a2.js`; view `visualization-312e649c79bd.js` → `GibbsFreeEnergyVisualization`.

#### Global atmospheric circulation

Circulation cell

Type `GLOBAL_ATMOSPHERIC_CIRCULATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-c17c1068abe8.js` → `Visualization`.

#### Glycolysis

Glycolysis stage

Type `GLYCOLYSIS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4d4ef103d7e3.js` → `GlycolysisVisualization`.

#### Gpcr signaling

G-protein pathway

Type `GPCR_SIGNALING` · manifest v1.

Parameters: `pathway` (enum, default `Gs`, one of `Gs`, `Gi`, `Gq`).

Source: manifest `model-e7c8cc43e8df.js`; view `visualization-fd889749a8a6.js` → `GpcrSignalingVisualization`.

#### Gpp vs npp: `\mathrm{NPP}=\mathrm{GPP}-R_a`

Gross primary productivity

Type `GPP_VS_NPP` · manifest v2 · formula `\mathrm{NPP}=\mathrm{GPP}-R_a`.

Parameters: `gross_primary_productivity` (number, default `240`, range 100 to 400); `autotrophic_respiration` (number, default `80`, range 0 to 100).

Source: manifest `type-1aff40f97e6c.js`; view `visualization-906ddd1c9c4e.js` → `GppVsNppVisualization`.

#### Gram stain

Type `GRAM_STAIN` · manifest v1.

Parameters: `bacteriaType` (enum, default `positive`, one of `positive`, `negative`).

Source: manifest `type-6ec40c0e5685.js`; view `visualization-cf03c94e7c83.js` → `GramStainVisualization`.

#### Grand staff piano map

Choose an octave

Type `GRAND_STAFF_PIANO_MAP`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f005e0dfbe4d.js` → `Visualization`.

#### Graphable function

Type `GRAPHABLE_FUNCTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a4a216182b0b.js` → `GraphableFunctionVisualization`.

#### Graphable function (v2)

Type `GRAPHABLE_FUNCTION_V2`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-e5136550ac31.js` → `GraphableFunctionV2Visualization`.

#### Greenhouse infrared trapping

Type `GREENHOUSE_INFRARED_TRAPPING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4f14f02e6011.js` → `GreenhouseInfraredTrappingVisualization`.

#### Guitar chord chart

Type `GUITAR_CHORD_CHART`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-27f1694adf75.js` → `Visualization`.

#### Guitar fretboard map

Highlight a pitch class

Type `GUITAR_FRETBOARD_MAP`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-9070ef3f9100.js` → `Visualization`.

#### Guitar scale patterns

Type `GUITAR_SCALE_PATTERNS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-184df2a7b810.js` → `Visualization`.

#### Habitat fragmentation

Patch connectivity

Type `HABITAT_FRAGMENTATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b3303bb6a474.js` → `HabitatFragmentationVisualization`.

#### Half full adder logic

Type `HALF_FULL_ADDER_LOGIC` · manifest v2.

Parameters: `a` (boolean, default `true`); `b` (boolean, default `false`); `carryIn` (boolean, default `true`).

Source: manifest `type-6637f6f4ce37.js`; view `visualization-b8b4e641e175.js` → `HalfFullAdderLogicVisualization`.

#### Half life relation

Type `HALF_LIFE_RELATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-fe6162982300.js` → `HalfLifeRelationVisualization`.

#### Halogen reactivity trend

Type `HALOGEN_REACTIVITY_TREND` · manifest v3.

Parameters: `initial_halogen` (enum, default `chlorine`, one of `chlorine`, `bromine`, `iodine`); `initial_halide` (enum, default `bromide`, one of `chloride`, `bromide`, `iodide`).

Source: manifest `model-9811711de13c.js`; view `visualization-56c87356f914.js` → `HalogenReactivityVisualization`.

#### Hardy weinberg equilibrium: `p^2 + 2pq + q^2 = 1`

Frequency of allele A

Type `HARDY_WEINBERG_EQUILIBRIUM` · manifest v3 · formula `p^2 + 2pq + q^2 = 1`.

Parameters: `allele_frequency_p` (number, default `0.5`, range 0 to 1).

Source: manifest `model-e6350a687712.js`; view `visualization-4b460904bda9.js` → `HardyWeinbergVisualization`.

#### Hash table collisions: `h(k)=k\bmod 7`

Collision-resolution strategy

Type `HASH_TABLE_COLLISIONS` · manifest v2 · formula `h(k)=k\bmod 7`.

Parameters: `resolution_strategy` (enum, default `separate chaining`, one of `separate chaining`, `linear probing`).

Source: manifest `model-8a1ce53f2bd0.js`; view `visualization-83ddd0f310c5.js` → `HashTableCollisionsVisualization`.

#### Hemoglobin curve

Oxygen partial pressure

Type `HEMOGLOBIN_CURVE` · manifest v1.

Parameters: `oxygenPartialPressureMmHg` (number, default `40`, range 0 to 120); `ph` (number, default `7.4`, range 7.2 to 7.6); `carbonDioxidePartialPressureMmHg` (number, default `40`, range 20 to 60); `temperatureCelsius` (number, default `37`, range 35 to 39).

Source: manifest `type-9f5bb286483b.js`; view `visualization-b440fb4240ce.js` → `HemoglobinCurveVisualization`.

#### Hemostasis and clotting

Hemostasis stage

Type `HEMOSTASIS_AND_CLOTTING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b5fa7bd43ce3.js` → `HemostasisVisualization`.

#### Herons formula area

Type `HERONS_FORMULA_AREA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-c0b8043ae0f7.js` → `HeronsFormulaAreaVisualization`.

#### Heteroskedasticity

Type `HETEROSKEDASTICITY` · manifest v3.

Parameters: `initial_variance_pattern` (enum, default `constant`, one of `constant`, `increasing`, `decreasing`, `bulge`).

Source: manifest `model-45fb684d19d6.js`; view `visualization-054c23475866.js` → `HeteroskedasticityVisualization`.

#### Histogram

Distribution shape

Type `HISTOGRAM` · manifest v2.

Parameters: `distribution_shape` (enum, default `roughly symmetric`, one of `roughly symmetric`, `skewed right`, `bimodal`, `gap or outlier`).

Source: manifest `model-dbdb00b115a8.js`; view `visualization-239f3acfd51a.js` → `HistogramVisualization`.

#### Homogeneous ode roots: `ay''+by'+cy=0`

Coefficient {coefficient} for {dependentVariable} double prime

Type `HOMOGENEOUS_ODE_ROOTS` · manifest v3 · formula `ay''+by'+cy=0`.

Parameters: `a` (number, default `1`, range 0.1 to 100); `b` (number, default `2`, range -10000 to 10000); `c` (number, default `5`, range -10000 to 10000).

Source: manifest `type-9e1fda92abdc.js`; view `visualization-f09acdc5ad65.js` → `HomogeneousOdeRootsVisualization`.

#### Homogeneous vs heterogeneous mixture

Type `HOMOGENEOUS_VS_HETEROGENEOUS_MIXTURE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-160bdcae379d.js` → `Visualization`.

#### Homologous structures

Trace a corresponding bone group

Type `HOMOLOGOUS_STRUCTURES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d21f34f278ef.js` → `HomologousStructuresVisualization`.

#### Hookes law

Type `HOOKES_LAW`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-235c5a9d81ea.js` → `HookesLawVisualization`.

#### Http protocol

{protocol} exchange step

Type `HTTP_PROTOCOL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4bb56896e6c9.js` → `HttpProtocolVisualization`.

#### Human body systems map

Select an organ system

Type `HUMAN_BODY_SYSTEMS_MAP` · manifest v3.

Parameters: `focus_system` (enum, default `respiratory`, one of `integumentary`, `skeletal`, `muscular`, `nervous`, `endocrine`, `cardiovascular`, `lymphatic-immune`, `respiratory`, `digestive`, `urinary-excretory`, `reproductive`).

Source: manifest `model-31563588c1d0.js`; view `visualization-e45b250e5ba2.js` → `Visualization`.

#### Hybridization sigma pi bonds

Type `HYBRIDIZATION_SIGMA_PI_BONDS` · manifest v1.

Parameters: `hybridization` (enum, default `sp2`, one of `sp3`, `sp2`, `sp`).

Source: manifest `type-6fafbd960065.js`; view `visualization-4b6277aa4b9d.js` → `HybridizationVisualization`.

#### Hydrocarbon structures

Type `HYDROCARBON_STRUCTURES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-8e94aafaf178.js` → `Visualization`.

#### Hydroelectric dam

Type `HYDROELECTRIC_DAM`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7b8146daccce.js` → `Visualization`.

#### Hydrogen fuel cell

Fuel-cell process stage

Type `HYDROGEN_FUEL_CELL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a8d9f7152a13.js` → `HydrogenFuelCellVisualization`.

#### Hypergeometric distribution: `P(X=k)=\frac{\binom{K}{k}\binom{N-K}{n-k}}{\binom{N}{n}}`

Successes in the population

Type `HYPERGEOMETRIC_DISTRIBUTION` · manifest v5 · formula `P(X=k)=\frac{\binom{K}{k}\binom{N-K}{n-k}}{\binom{N}{n}}`.

Parameters: `population_size` (integer, default `12`, range 12 to 24); `population_successes` (integer, default `5`, range 0 to 12); `sample_size` (integer, default `7`, range 1 to 12).

Source: manifest `model-e077e5821034.js`; view `visualization-b9d0bffa8a6b.js` → `HypergeometricDistributionVisualization`.

#### Hyperopia

Object distance in meters

Type `HYPEROPIA` · manifest v3.

Parameters: `objectDistanceMeters` (number, default `0.5`, range 0.25 to 6).

Source: manifest `type-9f359e6ad739.js`; view `visualization-32c3fdc2db6e.js` → `HyperopiaVisualization`.

#### Ideal transformer: `\frac{V_s}{V_p}=\frac{N_s}{N_p}`

Type `IDEAL_TRANSFORMER` · manifest v2 · formula `\frac{V_s}{V_p}=\frac{N_s}{N_p}`.

Parameters: `turnsRatio` (number, default `2`, range 0.1 to 10); `loadResistanceOhms` (number, default `30`, range 1 to 10000).

Source: manifest `type-f90cbc2eec2d.js`; view `visualization-47cee661b8d4.js` → `IdealTransformerVisualization`.

#### Ieee 754 floating point: `x=(-1)^s(1.f)_2\,2^{E-\mathrm{bias}}`

Type `IEEE_754_FLOATING_POINT` · manifest v2 · formula `x=(-1)^s(1.f)_2\,2^{E-\mathrm{bias}}`.

Parameters: `precision` (enum, default `single`, one of `single`, `double`).

Source: manifest `model-cdb21fd8d79e.js`; view `visualization-ffc674fb4cfa.js` → `Ieee754Visualization`.

#### If statement execution flow

Score

Type `IF_STATEMENT_EXECUTION_FLOW` · manifest v1.

Parameters: `score` (integer, default `60`, range 0 to 100).

Source: manifest `type-62569be7b3b6.js`; view `visualization-cb3872e3cd27.js` → `IfStatementExecutionFlowVisualization`.

#### Igneous cooling rate and crystal size

Slow underground cooling

Type `IGNEOUS_COOLING_RATE_AND_CRYSTAL_SIZE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7cb1e047bc5d.js` → `Visualization`.

#### Immune cell phagocytosis

Phagocytosis stage

Type `IMMUNE_CELL_PHAGOCYTOSIS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-61f9367ff9b1.js` → `ImmuneCellPhagocytosisVisualization`.

#### Import quota

Type `IMPORT_QUOTA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3681c4bb868e.js` → `ImportQuotaVisualization`.

#### Incidence vs prevalence

Type `INCIDENCE_VS_PREVALENCE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4a37b97f8be1.js` → `IncidenceVsPrevalenceVisualization`.

#### Inclined plane acceleration: `a = g \sin \theta`

Incline angle

Type `INCLINED_PLANE_ACCELERATION` · manifest v2 · formula `a = g \sin \theta`.

Parameters: `planeAngleDegrees` (number, default `30`, range 15 to 45); `boxMassKilograms` (number, default `4`, range 2 to 6).

Source: manifest `type-dc5d4e4fe966.js`; view `visualization-c383d1891675.js` → `InclinedPlaneAccelerationVisualization`.

#### Independent assortment

Metaphase-I orientation

Type `INDEPENDENT_ASSORTMENT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-0556e1bbda3f.js` → `Visualization`.

#### Independent probability intersection

Type `INDEPENDENT_PROBABILITY_INTERSECTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-9b7df26b54fe.js` → `IndependentProbabilityIntersectionVisualization`.

#### Initial rate experiment: `\frac{r_{0,2}}{r_{0,1}}=\left(\frac{[X]_{0,2}}{[X]_{0,1}}\right)^p`

Vary reactant {reactant}

Type `INITIAL_RATE_EXPERIMENT` · manifest v3 · formula `\frac{r_{0,2}}{r_{0,1}}=\left(\frac{[X]_{0,2}}{[X]_{0,1}}\right)^p`.

Parameters: `order_a` (enum, default `first`, one of `zero`, `first`, `second`); `order_b` (enum, default `second`, one of `zero`, `first`, `second`).

Source: manifest `model-353d6b580655.js`; view `visualization-840393e5ac19.js` → `InitialRateExperimentVisualization`.

#### Innate vs adaptive immunity

Immune-response timeline

Type `INNATE_VS_ADAPTIVE_IMMUNITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d451442a0f10.js` → `Visualization`.

#### Insertion sort

Insertion sort actions

Type `INSERTION_SORT` · manifest v1.

Parameters: `value1` (number, default `7`, range 1 to 9); `value2` (number, default `3`, range 1 to 9); `value3` (number, default `8`, range 1 to 9); `value4` (number, default `2`, range 1 to 9); `value5` (number, default `6`, range 1 to 9); `value6` (number, default `4`, range 1 to 9); `value7` (number, default `5`, range 1 to 9).

Source: manifest `model-9ce2e0b98e4f.js`; view `visualization-90b606e3554c.js` → `InsertionSortVisualization`.

#### Instrument families

Type `INSTRUMENT_FAMILIES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d8a6cecf22dd.js` → `Visualization`.

#### Insulin deficiency vs resistance

Type `INSULIN_DEFICIENCY_VS_RESISTANCE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ee9980ecb915.js` → `Visualization`.

#### Integral

Type `INTEGRAL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-2624cc695fab.js` → `IntegralVisualization`.

#### Integration by parts

Type `INTEGRATION_BY_PARTS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-569b750fdde1.js` → `IntegrationByPartsVisualization`.

#### Integration estimation

Type `INTEGRATION_ESTIMATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1f97e523002d.js` → `IntegrationEstimationVisualization`.

#### Intermolecular forces

Choose a molecular example

Type `INTERMOLECULAR_FORCES` · manifest v1.

Parameters: `initial_example` (enum, default `water`, one of `methane`, `hydrogen chloride`, `water`).

Source: manifest `type-9e89df8b418e.js`; view `visualization-cb92d5972f52.js` → `IntermolecularForcesVisualization`.

#### International trade world price

Type `INTERNATIONAL_TRADE_WORLD_PRICE` · manifest v3.

Parameters: `world_price` (number, default `40`, range 18 to 82).

Source: manifest `type-df5248337cc3.js`; view `visualization-b6167c8c7e92.js` → `InternationalTradeWorldPriceVisualization`.

#### Ionic bond formation

Type `IONIC_BOND_FORMATION` · manifest v2.

Parameters: `compound` (enum, default `sodium chloride`, one of `sodium chloride`, `magnesium oxide`, `magnesium chloride`, `sodium oxide`).

Source: manifest `model-483deeec96b8.js`; view `visualization-922bf84d8664.js` → `IonicBondFormationVisualization`.

#### Ionic formulas

Choose a cation

Type `IONIC_FORMULAS` · manifest v2.

Parameters: `cation` (enum, default `aluminum`, one of `sodium`, `potassium`, `silver`, `magnesium`, `calcium`, `zinc`, `barium`, `aluminum`, `iron_iii`); `anion` (enum, default `oxide`, one of `chloride`, `fluoride`, `bromide`, `oxide`, `sulfide`, `nitride`, `phosphide`).

Source: manifest `type-892c2b1ba446.js`; view `visualization-15370ee9ad61.js` → `IonicFormulasVisualization`.

#### Ionic lattice

Sodium ion center

Type `IONIC_LATTICE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f375362cf2c8.js` → `Visualization`.

#### Ionic vs covalent

Type `IONIC_VS_COVALENT` · manifest v1.

Parameters: `bondType` (enum, default `ionic`, one of `ionic`, `covalent`).

Source: manifest `type-72520cdd5971.js`; view `visualization-5d633b38784b.js` → `IonicVsCovalentVisualization`.

#### Ir spectroscopy

Type `IR_SPECTROSCOPY` · manifest v2.

Parameters: `initial_molecular_class` (enum, default `alcohol`, one of `alkane`, `alcohol`, `ketone`, `carboxylic acid`, `nitrile`).

Source: manifest `model-4e2972a7ab7b.js`; view `visualization-f95c2030f806.js` → `Visualization`.

#### Irrigation and salinization

Drainage condition

Type `IRRIGATION_AND_SALINIZATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-94f3ace63992.js` → `IrrigationVisualization`.

#### Island biogeography

Island-biogeography equilibrium graph for a {case}. Equilibrium richness is {richness} of {sourcePool} source-pool species. Immigration and extinction are equal at a nonzero turnover rate of {turnover}. The four cases run from small and far, with the fewest species, to large and near, with the most.

Type `ISLAND_BIOGEOGRAPHY` · manifest v4.

Parameters: `island_area` (enum, default `large`, one of `small`, `large`); `isolation` (enum, default `near`, one of `near`, `far`).

Source: manifest `model-a8957b9529f0.js`; view `visualization-f90e48f995cc.js` → `Visualization`.

#### Isosceles triangle

Type `ISOSCELES_TRIANGLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-488d1de6d559.js` → `IsoscelesTriangleVisualization`.

#### Isotope atomic mass

Choose an element

Type `ISOTOPE_ATOMIC_MASS` · manifest v2.

Parameters: `element` (enum, default `chlorine`, one of `boron`, `carbon`, `neon`, `magnesium`, `sulfur`, `chlorine`, `copper`).

Source: manifest `type-b5e0ca3b765a.js`; view `visualization-ade58d0a6e4a.js` → `IsotopeAtomicMassVisualization`.

#### Iupac hydrocarbon naming

Type `IUPAC_HYDROCARBON_NAMING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-241a9ebbb5bd.js` → `Visualization`.

#### Joint marginal conditional table

{rowLabel} and {columnLabel}: {count, plural, one {# student} other {# students}}

Type `JOINT_MARGINAL_CONDITIONAL_TABLE` · manifest v2.

Parameters: `probabilityQuestion` (enum, default `passed_and_studied`, one of `passed_and_studied`, `passed_and_did_not_study`, `did_not_pass_and_studied`, `did_not_pass_and_did_not_study`, `passed`, `did_not_pass`, `studied`, `did_not_study`, `studied_given_passed`, `did_not_study_given_passed`, `studied_given_did_not_pass`, `did_not_study_given_did_not_pass`, `passed_given_studied`, `did_not_pass_given_studied`, `passed_given_did_not_study`, `did_not_pass_given_did_not_study`).

Source: manifest `model-fd7375308d68.js`; view `visualization-513574d03856.js` → `JointMarginalConditionalTableVisualization`.

#### Kaplan meier survival curve

No censoring

Type `KAPLAN_MEIER_SURVIVAL_CURVE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-9e7f8f517e90.js` → `Visualization`.

#### Keynesian cross

Marginal propensity to consume

Type `KEYNESIAN_CROSS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-143a137a08fe.js` → `KeynesianCrossVisualization`.

#### Keystone species and trophic cascade

Keystone present

Type `KEYSTONE_SPECIES_AND_TROPHIC_CASCADE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6a7b78d6e551.js` → `KeystoneCascadeVisualization`.

#### Kinase cascade

Kinase cascade stage

Type `KINASE_CASCADE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d4c0982bc7c3.js` → `KinaseCascadeVisualization`.

#### Kinematics velocity: `v_f = v_i + at`

Type `KINEMATICS_VELOCITY` · manifest v3 (also v3, v3, v3) · formula `v_f = v_i + at`, also `v = u + at`, `v = v_0 + at`, `u + at = v`.

Parameters: `initialVelocityMetersPerSecond` (number, default `2`, range -6 to 10); `accelerationMetersPerSecondSquared` (number, default `1`, range -2 to 4); `timeSeconds` (number, default `5`, range 1 to 9).

Source: manifest `type-ce7a4fb22b44.js`; view `visualization-649746f2cf17.js` → `KinematicsDisplacementUniformAccelerationVisualization`.

#### Kinetic and potential energy: `E_{\text{total}} = PE + KE`

Type `KINETIC_AND_POTENTIAL_ENERGY` · manifest v2 · formula `E_{\text{total}} = PE + KE`.

Parameters: `startHeightMeters` (number, default `6`, range 2 to 10).

Source: manifest `type-ae7b919b937d.js`; view `visualization-be25a9579c23.js` → `KineticPotentialEnergyVisualization`.

#### Kinetic energy: `\mathrm{KE} = \frac{1}{2}mv^2`

Type `KINETIC_ENERGY` · manifest v2 · formula `\mathrm{KE} = \frac{1}{2}mv^2`, also `KE = \frac{1}{2}mv^2`, `K = \frac{1}{2}mv^2`, `KE = mv^2/2`, `K = mv^2/2`, `\frac{1}{2}mv^2 = KE`, `mv^2/2 = KE`.

Parameters: `mass` (number, default `5`, range 1 to 9); `velocity` (number, default `0`, range -10 to 10).

Source: manifest `type-e6de8eed347a.js`; view `visualization-3786d8b10a7d.js` → `KineticEnergyVisualization`.

#### Knn neighbor voting

Number of nearest neighbors

Type `KNN_NEIGHBOR_VOTING` · manifest v1.

Parameters: `k` (integer, default `5`, range 1 to 9); `queryX` (number, default `5.2`, range 0 to 10); `queryY` (number, default `3.3`, range 0 to 10).

Source: manifest `model-9d831e60e68f.js`; view `visualization-7a5efaae0633.js` → `KnnNeighborVotingVisualization`.

#### Labeled drum kit

Drum-kit component

Type `LABELED_DRUM_KIT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-17d41905f3b4.js` → `LabeledDrumKitVisualization`.

#### Labor force flows

Type `LABOR_FORCE_FLOWS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6978e879bd13.js` → `LaborForceFlowsVisualization`.

#### Labor markets

Type `LABOR_MARKETS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-eb4526290515.js` → `FactorMarketEquilibriumVisualization`.

#### Lac operon

Type `LAC_OPERON`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6dd5a8d9a242.js` → `Visualization`.

#### Laffer curve

Type `LAFFER_CURVE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1407d3942ee4.js` → `Visualization`.

#### Land and sea breeze

Type `LAND_AND_SEA_BREEZE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-329290f2d105.js` → `Visualization`.

#### Landfill design

Water entry, from dry to heavy rainfall

Type `LANDFILL_DESIGN`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1431910987d7.js` → `Visualization`.

#### Landslide risk and movement types

Movement type

Type `LANDSLIDE_RISK_AND_MOVEMENT_TYPES` · manifest v2.

Parameters: `initial_movement_type` (enum, default `fall`, one of `fall`, `topple`, `rotational slide`, `translational slide`, `spread`, `flow`).

Source: manifest `model-a050f4969274.js`; view `visualization-ed4cc07bffe9.js` → `Visualization`.

#### Latitude longitude

Type `LATITUDE_LONGITUDE` · manifest v1.

Parameters: `latitude` (integer, default `30`, range -90 to 90); `longitude` (integer, default `45`, range -180 to 180).

Source: manifest `model-fe09a72207e2.js`; view `visualization-bbc0d8c9e4ee.js` → `Visualization`.

#### Law of cosines

Type `LAW_OF_COSINES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-826d4d6eb52f.js` → `LawOfCosinesVisualization`.

#### Law of definite proportions

Sample-size multiplier

Type `LAW_OF_DEFINITE_PROPORTIONS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-2058de5925a6.js` → `LawOfDefiniteProportionsVisualization`.

#### Law of reflection: `\theta_i = \theta_r`

Type `LAW_OF_REFLECTION` · manifest v3 · formula `\theta_i = \theta_r`.

Parameters: `incidentAngleDeg` (number, default `40`, range 10 to 75).

Source: manifest `model-2bccbf866c14.js`; view `visualization-795c85263af8.js` → `LawOfReflectionVisualization`.

#### Lcm

Type `LCM` · manifest v4.

Parameters: `first_number` (integer, default `4`, range 1 to 12); `second_number` (integer, default `6`, range 1 to 12).

Source: manifest `type-afc86e267b1f.js`; view `visualization-62440ccc0b88.js` → `LcmVisualization`.

#### Ld50 dose response curve

Administered dose in milligrams per kilogram

Type `LD50_DOSE_RESPONSE_CURVE` · manifest v5.

Parameters: `reference_ld50_mg_per_kg` (number, default `100`, range 3 to 300); `comparison_ld50_mg_per_kg` (number, default `30`, range 3 to 300).

Source: manifest `model-5e134de0146d.js`; view `visualization-a21ed490d122.js` → `Visualization`.

#### Le chateliers principle

Select the equilibrium stress

Type `LE_CHATELIERS_PRINCIPLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ff11fdb2b93b.js` → `Visualization`.

#### Least square regression

Observed data points

Type `LEAST_SQUARE_REGRESSION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3edf032f5c04.js` → `LeastSquareRegressionVisualization`.

#### Lens equation: `\frac{1}{f} = \frac{1}{d_o} + \frac{1}{d_i}`

Type `LENS_EQUATION` · manifest v4 · formula `\frac{1}{f} = \frac{1}{d_o} + \frac{1}{d_i}`, also `\frac{1}{f} = \frac{1}{a} + \frac{1}{b}`, `1/f=1/do+1/di`, `1/f=1/di+1/do`, `1/f=1/b+1/a`, `1/do+1/di=1/f`, `1/di+1/do=1/f`, `1/a+1/b=1/f`, `1/b+1/a=1/f`.

Parameters: `objectDistance` (number, default `32`, range 0.01 to 10000); `focalLength` (number, default `16`, range -10000 to 10000).

Source: manifest `type-2b5f6faeedd9.js`; view `visualization-d03c94513c53.js` → `LensEquationVisualization`.

#### Levels of organization

Type `LEVELS_OF_ORGANIZATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6437f17b755a.js` → `Visualization`.

#### Lewis dot symbols

{name} ({symbol})

Type `LEWIS_DOT_SYMBOLS` · manifest v2.

Parameters: `element` (enum, default `C`, one of `H`, `He`, `Li`, `Be`, `B`, `C`, `N`, `O`, `F`, `Ne`, `Na`, `Mg`, `Al`, `Si`, `P`, `S`, `Cl`, `Ar`).

Source: manifest `type-84ec9bea3a73.js`; view `visualization-cb0e587e1497.js` → `Visualization`.

#### Lewis structure builder

Molecule or ion

Type `LEWIS_STRUCTURE_BUILDER` · manifest v3.

Parameters: `molecule` (enum, default `carbon dioxide`, one of `water`, `ammonia`, `carbon dioxide`, `hydrogen cyanide`, `formate ion`, `nitrite ion`).

Source: manifest `model-afc621595d57.js`; view `visualization-658f13d326fd.js` → `Visualization`.

#### Likelihood function: `L(p\mid k,n) \propto p^k(1-p)^{n-k}`

Observed successes

Type `LIKELIHOOD_FUNCTION` · manifest v3 · formula `L(p\mid k,n) \propto p^k(1-p)^{n-k}`.

Parameters: `successes` (integer, default `3`, range 0 to 48); `trials` (integer, default `12`, range 12 to 48).

Source: manifest `type-8c2ee062fabe.js`; view `visualization-38810ffb5269.js` → `LikelihoodFunctionVisualization`.

#### Limiting reactant

Starting hydrogen molecules

Type `LIMITING_REACTANT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-691c74246707.js` → `LimitingReactantVisualization`.

#### Linear combination: `\vec{w}=a\vec{u}+b\vec{v}`

Multiplier {multiplier} for vector {vector}

Type `LINEAR_COMBINATION` · manifest v2 · formula `\vec{w}=a\vec{u}+b\vec{v}`.

Parameters: `coefficientA` (number, default `1`, range -2 to 2); `coefficientB` (number, default `1`, range -2 to 2).

Source: manifest `type-f010dd668ee0.js`; view `visualization-e7e1cbe15991.js` → `LinearCombinationVisualization`.

#### Linear equation two vars simple

Type `LINEAR_EQUATION_TWO_VARS_SIMPLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-33a3556015f9.js` → `LinearEquationTwoVarsSimpleVisualization`.

#### Linear independence discriminant: `A=\left|\det(\mathbf{u},\mathbf{v})\right|`

Type `LINEAR_INDEPENDENCE_DISCRIMINANT` · manifest v2 · formula `A=\left|\det(\mathbf{u},\mathbf{v})\right|`, also `\det(\mathbf{u},\mathbf{v})=u_xv_y-u_yv_x`, `\det(\mathbf{u},\mathbf{v})\ne 0`.

Parameters: `uX` (number, default `4`, range -20 to 20); `uY` (number, default `1`, range -20 to 20); `vX` (number, default `1`, range -20 to 20); `vY` (number, default `3`, range -20 to 20).

Source: manifest `type-630959edaee6.js`; view `visualization-b1cecb2f5c7e.js` → `LinearIndependenceVisualization`.

#### Linear inequalities feasible region

Bounded feasible region preset

Type `LINEAR_INEQUALITIES_FEASIBLE_REGION` · manifest v1.

Parameters: `slope1` (number, default `1`, range -4 to 4); `intercept1` (number, default `-2`, range -6 to 6); `relation1` (enum, default `>=`, one of `<=`, `>=`, `<`, `>`); `slope2` (number, default `-1`, range -4 to 4); `intercept2` (number, default `-2`, range -6 to 6); `relation2` (enum, default `>=`, one of `<=`, `>=`, `<`, `>`); `slope3` (number, default `0`, range -4 to 4); `intercept3` (number, default `3`, range -6 to 6); `relation3` (enum, default `<=`, one of `<=`, `>=`, `<`, `>`).

Source: manifest `model-84524f724fa2.js`; view `visualization-f82a652d7167.js` → `LinearInequalitiesFeasibleRegionVisualization`.

#### Linear inequality solution ray: `ax + b \lessgtr c`

Coefficient {a}

Type `LINEAR_INEQUALITY_SOLUTION_RAY` · manifest v1 · formula `ax + b \lessgtr c`.

Parameters: `a` (integer, default `-3`, range -5 to 5); `b` (number, default `2`, range -12 to 12); `c` (number, default `11`, range -12 to 12); `relation` (enum, default `greater_than`, one of `less_than`, `greater_than`).

Source: manifest `model-f27f59868f2e.js`; view `visualization-1dffe74f6ee2.js` → `LinearInequalitySolutionRayVisualization`.

#### Lipids and phospholipids

Type `LIPIDS_AND_PHOSPHOLIPIDS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-c0da2af30cf4.js` → `Visualization`.

#### Loanable funds

Type `LOANABLE_FUNDS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a1b9556566d1.js` → `LoanableFundsVisualization`.

#### Logarithm inverse exponential

Type `LOGARITHM_INVERSE_EXPONENTIAL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-9c886b7a8239.js` → `LogarithmInverseExponentialVisualization`.

#### Logistic growth

Type `LOGISTIC_GROWTH`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-69c3741f5328.js` → `LogisticGrowthVisualization`.

#### Logistic regression: `P(Y=1\mid x)=\frac{1}{1+e^{-(\beta_0+\beta_1x)}}`

Continuous predictor value

Type `LOGISTIC_REGRESSION` · manifest v3 · formula `P(Y=1\mid x)=\frac{1}{1+e^{-(\beta_0+\beta_1x)}}`.

Parameters: `intercept` (number, default `-0.5`, range -2 to 2); `coefficient` (number, default `1.2`, range -2.5 to 2.5).

Source: manifest `type-8875ae84811a.js`; view `visualization-2bb14b30f3ac.js` → `LogisticRegressionVisualization`.

#### Long division

Type `LONG_DIVISION` · manifest v1.

Parameters: `dividend` (integer, default `458`, range 1 to 9999); `divisor` (integer, default `3`, range 1 to 99).

Source: manifest `type-eb0199ee4cef.js`; view `visualization-2688e8e23fb9.js` → `LongDivisionVisualization`.

#### Long run growth

Type `LONG_RUN_GROWTH`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-c27b7b1fe0d8.js` → `LongRunGrowthVisualization`.

#### Loop break control flow

Break condition outcome

Type `LOOP_BREAK_CONTROL_FLOW` · manifest v3.

Parameters: `loop_kind` (enum, default `for`, one of `for`, `while`); `loop_limit` (integer, default `5`, range 3 to 5); `break_value` (integer, default `2`, range 1 to 6).

Source: manifest `type-b7a8fbf7a420.js`; view `visualization-7eabe933a361.js` → `LoopBreakControlFlowVisualization`.

#### Lorenz curve

Income inequality Gini coefficient

Type `LORENZ_CURVE` · manifest v4.

Parameters: `gini_coefficient` (number, default `0.33`, range 0 to 0.65); `population_share` (number, default `50`, range 0 to 100).

Source: manifest `type-a513a18b2ee6.js`; view `visualization-dcd8545e8734.js` → `LorenzCurveVisualization`.

#### Lras

Type `LRAS` · manifest v1.

Parameters: `capacity_change_percent` (number, default `15`, range -35 to 35).

Source: manifest `model-182295b28076.js`; view `visualization-f7c14129468c.js` → `LrasVisualization`.

#### Lung gas gradient

Oxygen partial pressure in the alveolus

Type `LUNG_GAS_GRADIENT` · manifest v1.

Parameters: `alveolarOxygenPartialPressureMmHg` (number, default `100`, range 0 to 300); `bloodOxygenPartialPressureMmHg` (number, default `40`, range 0 to 300); `alveolarCarbonDioxidePartialPressureMmHg` (number, default `40`, range 0 to 150); `bloodCarbonDioxidePartialPressureMmHg` (number, default `45`, range 0 to 150).

Source: manifest `type-8a9437331f93.js`; view `visualization-afffe640df11.js` → `LungGasGradientVisualization`.

#### Lytic vs lysogenic virus cycle

Infection pathway

Type `LYTIC_VS_LYSOGENIC_VIRUS_CYCLE` · manifest v2.

Parameters: `initial_pathway` (enum, default `lytic`, one of `lytic`, `lysogenic`).

Source: manifest `type-ee3c6146db4d.js`; view `visualization-59ddcd0a3dbc.js` → `VirusCycleVisualization`.

#### Magnet induced current

Magnet motion animation controls

Type `MAGNET_INDUCED_CURRENT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6aeb8be5e5e2.js` → `MagnetInducedCurrentVisualization`.

#### Magnet induced current direction

Type `MAGNET_INDUCED_CURRENT_DIRECTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-cffefabfbfba.js` → `MagnetInducedCurrentDirectionVisualization`.

#### Magnetic field direction on charge: `\vec F_B=q\vec v\times\vec B`

Velocity direction angle

Type `MAGNETIC_FIELD_DIRECTION_ON_CHARGE` · manifest v1 · formula `\vec F_B=q\vec v\times\vec B`.

Parameters: `velocityAngleDegrees` (number, default `0`, range 0 to 360); `fieldDirection` (enum, default `into-page`, one of `into-page`, `out-of-page`); `chargeSign` (enum, default `positive`, one of `positive`, `negative`).

Source: manifest `type-f09422f3bf66.js`; view `visualization-22ef45e84d35.js` → `MagneticFieldDirectionVisualization`.

#### Map measurement

{point} horizontal position

Type `MAP_MEASUREMENT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-c950c4652803.js` → `MapMeasurementVisualization`.

#### Marginal analysis

Selected quantity

Type `MARGINAL_ANALYSIS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7337ab847926.js` → `MarginalAnalysisVisualization`.

#### Markovnikov alkene addition

HBr-addition step

Type `MARKOVNIKOV_ALKENE_ADDITION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ddc35f41f2a4.js` → `Visualization`.

#### Mass density volume relation: `\rho = \frac{m}{V}`

Type `MASS_DENSITY_VOLUME_RELATION` · manifest v4 · formula `\rho = \frac{m}{V}`, also `m = \rho V`, `rho = m / V`, `rho=m/v`, `d=m/v`, `m=rho v`, `m=dv`, `v=m/rho`, `v=m/d`, `m/v=rho`, `m/v=d`.

Parameters: `mass` (number, default `12`, range 0.01 to 10000); `volume` (number, default `5`, range 0.01 to 10000).

Source: manifest `type-18b6b503ca52.js`; view `visualization-3b808371bd51.js` → `MassDensityVolumeRelationVisualization`.

#### Mass spectrum

Choose a mass-spectrum example

Type `MASS_SPECTRUM` · manifest v4.

Parameters: `example` (enum, default `fragment-dominant`, one of `fragment-dominant`, `molecular-ion-dominant`, `chlorine-isotope-pattern`, `bromine-isotope-pattern`).

Source: manifest `type-793044e0b754.js`; view `visualization-e3bd374ddb8f.js` → `MassSpectrumVisualization`.

#### Mass spring shm: `T = 2\pi\sqrt{\frac{m}{k}}`

Mass-spring animation controls

Type `MASS_SPRING_SHM` · manifest v2 · formula `T = 2\pi\sqrt{\frac{m}{k}}`.

Parameters: `massKilograms` (number, default `1.5`, range 0.5 to 5); `springConstantNewtonsPerMeter` (number, default `40`, range 10 to 100); `amplitudeMeters` (number, default `0.25`, range 0.05 to 0.5).

Source: manifest `type-a880aebad1b1.js`; view `visualization-a7bf44a812d1.js` → `MassSpringShmVisualization`.

#### Matched pairs design

Choose matched-pairs design variant

Type `MATCHED_PAIRS_DESIGN` · manifest v3.

Parameters: `design_variant` (enum, default `separate-units`, one of `separate-units`, `self-paired`).

Source: manifest `model-3df69373af20.js`; view `visualization-9b3e2af8062f.js` → `Visualization`.

#### Matrix inverse 2d: `A^{-1}A=I\quad A^{-1}Ax=x`

Type `MATRIX_INVERSE_2D` · manifest v1 · formula `A^{-1}A=I\quad A^{-1}Ax=x`.

Parameters: `matrixA` (number, default `0`, range -2 to 2); `matrixB` (number, default `1`, range -2 to 2); `matrixC` (number, default `-1`, range -2 to 2); `matrixD` (number, default `0`, range -2 to 2); `vectorX` (number, default `1`, range -5 to 5); `vectorY` (number, default `2`, range -5 to 5).

Source: manifest `type-654523ab98b5.js`; view `visualization-daaffe2bdde0.js` → `MatrixInverseVisualization`.

#### Matrix multiplication row column rule

Type `MATRIX_MULTIPLICATION_ROW_COLUMN_RULE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f4378e4e2e8a.js` → `MatrixMultiplicationRowColumnRuleVisualization`.

#### Matrix transformation 2d: `A\vec{v}=\begin{bmatrix}a&b\\c&d\end{bmatrix}\begin{bmatrix}x\\y\end{bmatrix}`

Type `MATRIX_TRANSFORMATION_2D` · manifest v1 · formula `A\vec{v}=\begin{bmatrix}a&b\\c&d\end{bmatrix}\begin{bmatrix}x\\y\end{bmatrix}`.

Parameters: `matrixA` (number, default `2`, range -2 to 2); `matrixB` (number, default `0`, range -2 to 2); `matrixC` (number, default `0`, range -2 to 2); `matrixD` (number, default `2`, range -2 to 2); `vectorX` (number, default `1`, range -1.5 to 1.5); `vectorY` (number, default `1`, range -1.5 to 1.5).

Source: manifest `type-e537504d901a.js`; view `visualization-99c9d12a86a4.js` → `MatrixTransformationVisualization`.

#### Maxwell boltzmann distribution

Type `MAXWELL_BOLTZMANN_DISTRIBUTION` · manifest v4.

Parameters: `temperature_kelvin` (number, default `300`, range 200 to 800); `molar_mass_g_per_mol` (number, default `28`, range 4 to 80).

Source: manifest `type-f22c71cb1245.js`; view `visualization-8ab682579cb1.js` → `MaxwellBoltzmannVisualization`.

#### Mean as balance point

Data set

Type `MEAN_AS_BALANCE_POINT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6cc2bcacd89e.js` → `MeanAsBalancePointVisualization`.

#### Mean value theorem: `f'(c) = \frac{f(b) - f(a)}{b - a}`

Type `MEAN_VALUE_THEOREM` · manifest v3 · formula `f'(c) = \frac{f(b) - f(a)}{b - a}`.

Parameters: `cubicCoefficient` (number, default `0`, range -5 to 5); `quadraticCoefficient` (number, default `-0.25`, range -10 to 10); `linearCoefficient` (number, default `0.8`, range -20 to 20); `constantTerm` (number, default `4`, range -100 to 100); `intervalCenter` (number, default `5`, range -8 to 8); `intervalWidth` (number, default `2`, range 0.5 to 16).

Source: manifest `model-816de77e9772.js`; view `visualization-6fec739ed6a5.js` → `MeanValueTheoremVisualization`.

#### Mean vs median

Type `MEAN_VS_MEDIAN` · manifest v1.

Parameters: `outlierMode` (enum, default `without`, one of `without`, `with`).

Source: manifest `model-34404a0ff6b5.js`; view `visualization-7ace154736d1.js` → `MeanVsMedianVisualization`.

#### Mediation indirect effect: `c = c^{\prime} + a \times b`

Path coefficient {a}, predictor {predictor} to mediator {mediator}

Type `MEDIATION_INDIRECT_EFFECT` · manifest v1 · formula `c = c^{\prime} + a \times b`.

Parameters: `a` (number, default `0.6`, range -1 to 1); `b` (number, default `0.5`, range -1 to 1); `directEffect` (number, default `0.2`, range -1 to 1).

Source: manifest `type-e52ae9a5f679.js`; view `visualization-a066870e986b.js` → `MediationIndirectEffectVisualization`.

#### Meiosis

Type `MEIOSIS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-9162aa5f492f.js` → `MeiosisVisualization`.

#### Meiosis nondisjunction

Type `MEIOSIS_NONDISJUNCTION` · manifest v1.

Parameters: `errorDivision` (enum, default `meiosis-one`, one of `meiosis-one`, `meiosis-two`).

Source: manifest `model-265ef64a42f0.js`; view `visualization-591e1eda39c9.js` → `MeiosisNondisjunctionVisualization`.

#### Memory hierarchy

Level where the requested value is found

Type `MEMORY_HIERARCHY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4fbf2212f00d.js` → `Visualization`.

#### Menstrual cycle fertilization

No implantation

Type `MENSTRUAL_CYCLE_FERTILIZATION` · manifest v1.

Parameters: `day` (integer, default `1`, range 1 to 28); `outcome` (enum, default `noImplantation`, one of `noImplantation`, `successfulImplantation`).

Source: manifest `model-6d9c94a4186b.js`; view `visualization-8f90529ce182.js` → `MenstrualCycleFertilizationVisualization`.

#### Merge sort

Input length

Type `MERGE_SORT` · manifest v4.

Parameters: `value1` (integer, default `38`, range 1 to 99); `value2` (integer, default `12`, range 1 to 99); `value3` (integer, default `27`, range 1 to 99); `value4` (integer, default `43`, range 1 to 99); `value5` (integer, default `9`, range 1 to 99); `value6` (integer, default `31`, range 1 to 99); `value7` (integer, default `18`, range 1 to 99); `value8` (integer, default `25`, range 1 to 99).

Source: manifest `model-1a2ca3b0dc37.js`; view `visualization-e6fa8f90ded4.js` → `MergeSortVisualization`.

#### Meta analysis

Focal study effect estimate

Type `META_ANALYSIS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-2ffcc32eb493.js` → `MetaAnalysisVisualization`.

#### Meta analysis forest weights

Type `META_ANALYSIS_FOREST_WEIGHTS` · manifest v1.

Parameters: `effect1` (number, default `-0.35`, range -0.8 to 0.8); `effect2` (number, default `-0.08`, range -0.8 to 0.8); `effect3` (number, default `0.18`, range -0.8 to 0.8); `effect4` (number, default `0.42`, range -0.8 to 0.8); `effect5` (number, default `0.1`, range -0.8 to 0.8); `weight1` (number, default `5`, range 2 to 24); `weight2` (number, default `12`, range 2 to 24); `weight3` (number, default `8`, range 2 to 24); `weight4` (number, default `18`, range 2 to 24); `weight5` (number, default `10`, range 2 to 24).

Source: manifest `type-72e940cb9aa1.js`; view `visualization-da9b129c49fa.js` → `MetaAnalysisForestWeightsVisualization`.

#### Metal reactivity series

Type `METAL_REACTIVITY_SERIES` · manifest v3.

Parameters: `initial_solid_metal` (enum, default `zinc`, one of `magnesium`, `zinc`, `iron`, `copper`, `silver`); `initial_aqueous_metal` (enum, default `copper`, one of `magnesium`, `zinc`, `iron`, `copper`, `silver`).

Source: manifest `model-71af2c81ea03.js`; view `visualization-aa11c45b0861.js` → `MetalReactivitySeriesVisualization`.

#### Metallic bonding

Type `METALLIC_BONDING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-add97e529e6a.js` → `Visualization`.

#### Metric distance

Type `METRIC_DISTANCE` · manifest v1.

Parameters: `lengthCm` (number, default `32`, range 10 to 50); `unit` (enum, default `cm`, one of `mm`, `cm`, `m`, `km`).

Source: manifest `type-aa70f27546d0.js`; view `visualization-dab4e64077fe.js` → `MetricDistanceVisualization`.

#### Mhc i vs mhc ii presentation

Antigen-presentation pathway

Type `MHC_I_VS_MHC_II_PRESENTATION` · manifest v1.

Parameters: `initial_pathway` (enum, default `MHC I (endogenous)`, one of `MHC I (endogenous)`, `MHC II (exogenous)`).

Source: manifest `model-d908b4b52347.js`; view `visualization-5c1453e31d81.js` → `MhcPresentationVisualization`.

#### Michaelis menten dynamics

Type `MICHAELIS_MENTEN_DYNAMICS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-62334e8cf5dd.js` → `MichaelisMentenDynamicsVisualization`.

#### Microbial tolerance curve

Microbial temperature group

Type `MICROBIAL_TOLERANCE_CURVE` · manifest v3.

Parameters: `microbial_group` (enum, default `mesophile`, one of `psychrophile`, `mesophile`, `thermophile`, `hyperthermophile`); `temperature_c` (number, default `37`, range -10 to 110).

Source: manifest `model-28116a0d525d.js`; view `visualization-987817b8abc4.js` → `MicrobialToleranceCurveVisualization`.

#### Microphone polar patterns

Polar pattern

Type `MICROPHONE_POLAR_PATTERNS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-fcb4d20ca97e.js` → `Visualization`.

#### Midpoint formula

Type `MIDPOINT_FORMULA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-bf9e035ee05c.js` → `MidpointFormulaVisualization`.

#### Minimum wage

Type `MINIMUM_WAGE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-97da556cc15d.js` → `MinimumWageVisualization`.

#### Minor scale formula

Choose a tonic for the natural minor scale

Type `MINOR_SCALE_FORMULA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-8389786c7583.js` → `Visualization`.

#### Mirror equation: `\frac{1}{f} = \frac{1}{u} + \frac{1}{v}`

Type `MIRROR_EQUATION` · manifest v4 · formula `\frac{1}{f} = \frac{1}{u} + \frac{1}{v}`, also `\frac{1}{f} = \frac{1}{a} + \frac{1}{b}`, `1/f=1/v+1/u`, `1/f=1/b+1/a`, `1/u+1/v=1/f`, `1/v+1/u=1/f`, `1/a+1/b=1/f`, `1/b+1/a=1/f`.

Parameters: `objectDistance` (number, default `28`, range 0.01 to 10000); `focalLength` (number, default `14`, range -10000 to 10000).

Source: manifest `type-763c6e0ad6c9.js`; view `visualization-1c3dbba61969.js` → `MirrorEquationVisualization`.

#### Mitosis

Type `MITOSIS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a3b38749a667.js` → `MitosisVisualization`.

#### Mixed numbers

Type `MIXED_NUMBERS` · manifest v2.

Parameters: `numerator` (integer, default `23`, range 7 to 35).

Source: manifest `model-6ab8da229be6.js`; view `visualization-dacaa06a72b6.js` → `MixedNumbersVisualization`.

#### Mixing solutions: `C_{\mathrm{mix}}=\frac{C_1V_1+C_2V_2}{V_1+V_2}`

Type `MIXING_SOLUTIONS` · manifest v2 · formula `C_{\mathrm{mix}}=\frac{C_1V_1+C_2V_2}{V_1+V_2}`.

Parameters: `solution1VolumeLiters` (number, default `0.8`, range 0.01 to 1000); `solution1ConcentrationMolesPerLiter` (number, default `2`, range 0 to 20); `solution2VolumeLiters` (number, default `1.2`, range 0.01 to 1000); `solution2ConcentrationMolesPerLiter` (number, default `0.5`, range 0 to 20).

Source: manifest `type-cbd0267ff3a9.js`; view `visualization-a680913cdd37.js` → `MixingSolutionsVisualization`.

#### Molarity moles per liter

Type `MOLARITY_MOLES_PER_LITER`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-5c8772cc3adc.js` → `MolarityMolesPerLiterVisualization`.

#### Mole avogadro number visual

Amount in moles

Type `MOLE_AVOGADRO_NUMBER_VISUAL` · manifest v1.

Parameters: `substance` (enum, default `copper`, one of `carbon`, `copper`, `water`); `initial_moles` (number, default `1`, range 0.25 to 5).

Source: manifest `type-bd9c85267933.js`; view `visualization-3e9ee20189f5.js` → `Visualization`.

#### Molecular polarity

Select a molecule comparison

Type `MOLECULAR_POLARITY` · manifest v2.

Parameters: `molecule` (enum, default `H2O`, one of `CO2`, `H2O`, `BF3`, `NH3`, `CCl4`, `CH3Cl`).

Source: manifest `type-8376aae4ceec.js`; view `visualization-4c1a46505983.js` → `Visualization`.

#### Momentum: `p = mv`

Type `MOMENTUM` · manifest v2 · formula `p = mv`, also `v = p/m`, `p=vm`, `mv=p`, `vm=p`, `m=p/v`.

Parameters: `m1` (number, default `4`, range 0.01 to 10000); `m2` (number, default `4`, range 0.01 to 10000); `v` (number, default `6`, range 0 to 10000).

Source: manifest `type-85baef7164cd.js`; view `visualization-a4ecd1d62844.js` → `MomentumVisualization`.

#### Monetary policy

Type `MONETARY_POLICY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-e2ca0a0192b3.js` → `Visualization`.

#### Money market

Type `MONEY_MARKET`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-25ffd2badb02.js` → `MoneyMarketVisualization`.

#### Monopolistic competition

Type `MONOPOLISTIC_COMPETITION` · manifest v3.

Parameters: `entry_progress` (number, default `100`, range 0 to 100).

Source: manifest `type-1d713bfd423d.js`; view `visualization-25a2deb20e0d.js` → `MonopolisticCompetitionVisualization`.

#### Monopoly inefficiency

Highlighted benchmark

Type `MONOPOLY_INEFFICIENCY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1e8d00feca20.js` → `MonopolyInefficiencyVisualization`.

#### Monopoly pricing

Type `MONOPOLY_PRICING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3659e59850ac.js` → `MonopolyProfitVisualization`.

#### Monopsony labor market power

Monopsony labor market graph. Monopsony employment is {lm} and wage is {wm}; competitive employment is {lc} and wage is {wc}.

Type `MONOPSONY_LABOR_MARKET_POWER`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-17c949f6b3f3.js` → `MonopsonyLaborMarketPowerVisualization`.

#### Moon phases

Type `MOON_PHASES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f76bf3a5f9b1.js` → `MoonPhasesVisualization`.

#### Mosaic plot

Type `MOSAIC_PLOT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6177753502d7.js` → `Visualization`.

#### Mrna translation

Type `MRNA_TRANSLATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b16777efedeb.js` → `MrnaTranslationVisualization`.

#### Multiplication as repeated addition

Type `MULTIPLICATION_AS_REPEATED_ADDITION` · manifest v2.

Parameters: `groupCount` (integer, default `4`, range 1 to 6); `itemsPerGroup` (integer, default `3`, range 1 to 6).

Source: manifest `model-5e0ebac94978.js`; view `visualization-ff3e981b9ff4.js` → `Visualization`.

#### Musical harmonic series

Selected partial

Type `MUSICAL_HARMONIC_SERIES` · manifest v3.

Parameters: `fundamental_frequency_hz` (number, default `220`, range 20 to 2000).

Source: manifest `type-6bf72910493c.js`; view `visualization-d7b9d3245eef.js` → `Visualization`.

#### Musical interval chart

Interval number

Type `MUSICAL_INTERVAL_CHART` · manifest v4.

Parameters: `lower_note` (enum, default `C`, one of `C`, `C-sharp`, `D-flat`, `D`, `E-flat`, `E`, `F`, `F-sharp`, `G-flat`, `G`, `A-flat`, `A`, `B-flat`, `B`).

Source: manifest `type-d4074e9cd37d.js`; view `visualization-e36c8420fc86.js` → `Visualization`.

#### Mutation types

Type `MUTATION_TYPES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7799d2a12b9c.js` → `MutationTypesVisualization`.

#### Myopia

Object distance from the eye

Type `MYOPIA` · manifest v2.

Parameters: `objectDistanceMeters` (number, default `6`, range 0.25 to 6).

Source: manifest `type-d92a49fbb130.js`; view `visualization-2ec3f3ca4528.js` → `MyopiaVisualization`.

#### Natural monopoly

Choose fair-return pricing

Type `NATURAL_MONOPOLY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-5c794f9df6c8.js` → `NaturalMonopolyVisualization`.

#### Natural selection allele frequency

Type `NATURAL_SELECTION_ALLELE_FREQUENCY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1ee595df1593.js` → `NaturalSelectionAlleleFrequencyVisualization`.

#### Negative feedback loop

Negative-feedback stage

Type `NEGATIVE_FEEDBACK_LOOP` · manifest v1.

Parameters: `example` (enum, default `body_temperature`, one of `body_temperature`, `blood_glucose`, `thermostat`); `initial_deviation` (enum, default `above`, one of `above`, `below`).

Source: manifest `model-66d4b6ae060b.js`; view `visualization-8a62d8cb789e.js` → `NegativeFeedbackVisualization`.

#### Nephron

Filtrate pathway stage

Type `NEPHRON`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6b7e145af540.js` → `NephronVisualization`.

#### Nernst equation: `E_{\mathrm{cell}}=E^\circ_{\mathrm{cell}}-\frac{0.0592\,\mathrm{V}}{n}\log_{10}Q`

log ten Q

Type `NERNST_EQUATION` · manifest v3 · formula `E_{\mathrm{cell}}=E^\circ_{\mathrm{cell}}-\frac{0.0592\,\mathrm{V}}{n}\log_{10}Q`.

Parameters: `standard_cell_potential_v` (number, default `1.1`, range 0.1 to 1.3); `transferred_electrons` (integer, default `2`, range 1 to 4).

Source: manifest `model-37f1f0ea4383.js`; view `visualization-35569514d1cb.js` → `NernstEquationVisualization`.

#### Net ionic equations

Choose an aqueous reaction

Type `NET_IONIC_EQUATIONS` · manifest v2.

Parameters: `reaction_example` (enum, default `silver-chloride-precipitation`, one of `silver-chloride-precipitation`, `barium-sulfate-precipitation`, `strong-acid-base-neutralization`).

Source: manifest `model-1cc997c09d9b.js`; view `visualization-68364515c67b.js` → `Visualization`.

#### Network fault tolerance

Packet delivery from A to B

Type `NETWORK_FAULT_TOLERANCE` · manifest v2.

Parameters: `topology` (enum, default `ring`, one of `ring`, `mesh`, `star`, `tree`).

Source: manifest `model-cf3822ac6f6a.js`; view `visualization-3ae1ea008fe6.js` → `NetworkFaultToleranceVisualization`.

#### Newman projections

Molecule

Type `NEWMAN_PROJECTIONS` · manifest v2.

Parameters: `molecule` (enum, default `butane`, one of `ethane`, `butane`).

Source: manifest `model-5e45c222a8d6.js`; view `visualization-da3e34d4f723.js` → `NewmanProjectionVisualization`.

#### Newton first law

Type `NEWTON_FIRST_LAW`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d7f4c69a45bd.js` → `NewtonFirstLawVisualization`.

#### Newton second law: `F_{\mathrm{net}} = ma`

Type `NEWTON_SECOND_LAW` · manifest v3 · formula `F_{\mathrm{net}} = ma`, also `F=ma`, `a=F/m`, `m=F/a`.

Parameters: `netForceNewtons` (number, default `8`, range 2 to 12); `massKilograms` (number, default `2`, range 1 to 4).

Source: manifest `type-5028a1c12442.js`; view `visualization-3a7b771e6232.js` → `NewtonSecondLawVisualization`.

#### Newton third law

Type `NEWTON_THIRD_LAW`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-5273676b1fc6.js` → `NewtonThirdLawVisualization`.

#### Newtons gravitation law

Type `NEWTONS_GRAVITATION_LAW`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-53d23ce6cf47.js` → `NewtonsGravitationLawVisualization`.

#### Nitrogen cycle

Nitrogen-cycle process

Type `NITROGEN_CYCLE` · manifest v2.

Parameters: `focus_process` (enum, default `whole cycle`, one of `whole cycle`, `fixation`, `assimilation and food web`, `ammonification`, `nitrification`, `denitrification`).

Source: manifest `model-4ade1fb3e1f8.js`; view `visualization-f9286ccac6be.js` → `NitrogenCycleVisualization`.

#### Normal approximation to binomial

Integer success count k

Type `NORMAL_APPROXIMATION_TO_BINOMIAL` · manifest v3.

Parameters: `trials` (integer, default `40`, range 10 to 80); `success_probability` (number, default `0.5`, range 0.02 to 0.98); `success_count` (integer, default `20`, range 0 to 80); `event` (enum, default `at_most`, one of `at_most`, `at_least`, `exactly`).

Source: manifest `model-dff7e5b52187.js`; view `visualization-98d4b5348fe5.js` → `NormalApproximationVisualization`.

#### Nuclear decay modes

{mode}: parent {parentMass} {parentSymbol} becomes daughter {daughterMass} {daughterSymbol}; {radiation}. Mass number changes by {massChange}, atomic number by {atomicChange}, protons by {protonChange}, and neutrons by {neutronChange}.

Type `NUCLEAR_DECAY_MODES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-8c2b3a102fbe.js` → `Visualization`.

#### Nuclear fission

Fission-chain outcome

Type `NUCLEAR_FISSION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-465ef8ded4d6.js` → `Visualization`.

#### Nuclear fusion

Fusion reaction stage

Type `NUCLEAR_FUSION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-84495aeaecd2.js` → `Visualization`.

#### Nuclear power plant

Type `NUCLEAR_POWER_PLANT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-476c6bd66028.js` → `Visualization`.

#### Nucleotides dna and rna

Select DNA or RNA

Type `NUCLEOTIDES_DNA_AND_RNA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ef7eeeb1b864.js` → `Visualization`.

#### Obtuse triangle

Type `OBTUSE_TRIANGLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-300cf1c3577b.js` → `ObtuseTriangleVisualization`.

#### Ocean acidification

Atmospheric carbon dioxide

Type `OCEAN_ACIDIFICATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-dd3c7828f1a7.js` → `OceanAcidificationVisualization`.

#### Ogive

Cumulative-frequency graph for {total} grouped rent observations. The current class from {classLower} to {classUpper} adds {frequencyCount, plural, one {{frequency} observation} other {{frequency} observations}}, so the curve {slope}. Below {threshold}, about {countCount, plural, one {{count} observation} other {{count} observations}} or {percent} accumulate. At {percentile}, the estimated rent is {value}. Two empty classes keep the curve level near the top.

Type `OGIVE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3111fdb43e34.js` → `OgiveVisualization`.

#### Ohms law: `I = \frac{V}{R}`

Type `OHMS_LAW` · manifest v3 · formula `I = \frac{V}{R}`, also `V = IR`, `V = I \cdot R`, `V = I \times R`, `\Delta V = IR`, `u = ri`, `v=ri`, `ir=v`, `ri=v`, `i=\Delta V/R`, `i=(1/r)v`, `i=v(1/r)`, `i=1/r(v)`, `r=v/i`, `r=\Delta V/i`, `ri=u`, `i=u/r`, `i=(1/r)u`, `i=u(1/r)`, `i=1/r(u)`, `r=u/i`, `i=(v-v)/r`, `(v-v)/r=i`, `r=(v-v)/i`, `(v-v)/i=r`.

Parameters: `voltage` (number, default `12`, range 0 to 1000); `resistance` (number, default `6`, range 0.1 to 100000).

Source: manifest `type-4b769e1efbb8.js`; view `visualization-f0940b29167c.js` → `OhmsLawVisualization`.

#### Oil spill fate

Elapsed time after spill

Type `OIL_SPILL_FATE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d8b2110211d5.js` → `OilSpillFateVisualization`.

#### Okuns law

Output gap relative to potential output

Type `OKUNS_LAW`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-2d74f566f428.js` → `OkunsLawVisualization`.

#### One sample t test: `t = \frac{\bar{x}-\mu_0}{s/\sqrt{n}}`

Observed sample mean

Type `ONE_SAMPLE_T_TEST` · manifest v3 · formula `t = \frac{\bar{x}-\mu_0}{s/\sqrt{n}}`.

Parameters: `hypothesized_mean` (number, default `50`, range 0 to 100); `sample_mean` (number, default `54`, range 0 to 100); `sample_standard_deviation` (number, default `10`, range 0.1 to 100); `sample_size` (integer, default `16`, range 3 to 100); `alternative` (enum, default `two-sided`, one of `two-sided`, `greater`, `less`); `significance_level` (number, default `0.05`, range 0.001 to 0.2).

Source: manifest `model-bc3413504a24.js`; view `visualization-4204236fd328.js` → `OneSampleTTestVisualization`.

#### Operant conditioning

Type `OPERANT_CONDITIONING` · manifest v1.

Parameters: `behaviorEffect` (enum, default `more_likely`, one of `more_likely`, `less_likely`); `stimulusChange` (enum, default `added`, one of `added`, `removed`).

Source: manifest `model-68a88869b001.js`; view `visualization-cffe22d2ca4b.js` → `OperantConditioningVisualization`.

#### Orbital shapes

Select an atomic subshell

Type `ORBITAL_SHAPES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d1a144990fb8.js` → `Visualization`.

#### Orchestra seating

Type `ORCHESTRA_SEATING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4532b9939f37.js` → `Visualization`.

#### Osmosis

Type `OSMOSIS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-265570d03bf4.js` → `OsmosisVisualization`.

#### Osmotic pressure: `\pi = i c R T`

Solute concentration

Type `OSMOTIC_PRESSURE` · manifest v3 · formula `\pi = i c R T`.

Parameters: `solute_concentration_molar` (number, default `0.2`, range 0.05 to 0.5); `vant_hoff_factor` (number, default `2`, range 1 to 3); `temperature_kelvin` (number, default `298`, range 273 to 323).

Source: manifest `type-3a57bdeab4d8.js`; view `visualization-13fd7a23f408.js` → `Visualization`.

#### Outlier leverage influence

Choose a starting regression case

Type `OUTLIER_LEVERAGE_INFLUENCE` · manifest v3.

Parameters: `initial_case` (enum, default `influential`, one of `central-outlier`, `aligned-high-leverage`, `influential`).

Source: manifest `type-d42397bb5e22.js`; view `visualization-70628367e10c.js` → `Visualization`.

#### Oxygen sag curve

Oxygen-sag plot. Remaining biochemical oxygen demand falls downstream. Dissolved oxygen falls to {minimumCount, plural, one {{minimum} milligram per liter} other {{minimum} milligrams per liter}} after {timeCount, plural, one {{time} day} other {{time} days}}, then recovers toward the {saturation} milligrams per liter saturation reference. At the critical minimum, oxygen deficit is {deficitCount, plural, one {{deficit} milligram per liter} other {{deficit} milligrams per liter}} and deoxygenation equals reaeration.

Type `OXYGEN_SAG_CURVE` · manifest v4.

Parameters: `initial_ultimate_bod_mg_l` (number, default `9`, range 4 to 14); `initial_oxygen_deficit_mg_l` (number, default `0.25`, range 0 to 0.5); `deoxygenation_rate_per_day` (number, default `0.25`, range 0.15 to 0.35); `reaeration_rate_per_day` (number, default `0.75`, range 0.35 to 1.15).

Source: manifest `type-523f134bfeb2.js`; view `visualization-cd9b95b3c9da.js` → `Visualization`.

#### P series threshold: `\sum_{n=1}^{\infty}\frac{1}{n^p}`

Exponent p

Type `P_SERIES_THRESHOLD` · manifest v3 · formula `\sum_{n=1}^{\infty}\frac{1}{n^p}`.

Parameters: `p` (number, default `1`, range 0.6 to 1.4); `termCount` (integer, default `12`, range 4 to 30).

Source: manifest `type-ede084b98a92.js`; view `visualization-e76c0ffd72c4.js` → `PSeriesThresholdVisualization`.

#### Paired t test

Common after-minus-before change

Type `PAIRED_T_TEST` · manifest v4.

Parameters: `number_of_pairs` (integer, default `10`, range 4 to 16); `alternative` (enum, default `two-sided`, one of `two-sided`, `greater`, `less`).

Source: manifest `model-a8a79b39391c.js`; view `visualization-d591f2fb7e56.js` → `PairedTTestVisualization`.

#### Parallel line

{lineName} crosses the y-axis at {intercept}.

Type `PARALLEL_LINE` · manifest v2.

Parameters: `slope` (number, default `0.6`, range -1 to 1); `referenceIntercept` (number, default `0`, range -4 to 4); `comparisonIntercept` (number, default `3`, range -4 to 4).

Source: manifest `type-5ace481a4856.js`; view `visualization-7ce35fa0a129.js` → `ParallelLineVisualization`.

#### Particulate matter size

Type `PARTICULATE_MATTER_SIZE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-10706cd739e0.js` → `ParticulateMatterSizeVisualization`.

#### Pascals law hydraulics: `p = \frac{F}{A}`

Input force

Type `PASCALS_LAW_HYDRAULICS` · manifest v2 · formula `p = \frac{F}{A}`.

Parameters: `inputForceNewtons` (number, default `100`, range 20 to 200); `inputAreaSquareCentimeters` (number, default `10`, range 5 to 25); `outputAreaSquareCentimeters` (number, default `50`, range 25 to 100).

Source: manifest `type-9d02b768e9bf.js`; view `visualization-9bc8c05f909f.js` → `PascalsLawHydraulicsVisualization`.

#### Pcr cycle

Type `PCR_CYCLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-68178d2ffbdd.js` → `PcrCycleVisualization`.

#### Pedigree

Inheritance example

Type `PEDIGREE` · manifest v3.

Parameters: `inheritance_pattern` (enum, default `autosomal-dominant`, one of `autosomal-dominant`, `autosomal-recessive`, `x-linked-recessive`).

Source: manifest `model-a39f1b9e2e01.js`; view `visualization-931f8ff88115.js` → `PedigreeVisualization`.

#### Percent part whole proportion

Type `PERCENT_PART_WHOLE_PROPORTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d71bc30799ff.js` → `PercentPartWholeProportionVisualization`.

#### Perfect competition

Type `PERFECT_COMPETITION` · manifest v6.

Parameters: `adjustment` (enum, default `profit_entry`, one of `profit_entry`, `loss_exit`).

Source: manifest `model-3deda9c55881.js`; view `visualization-1b2de1fa3a68.js` → `LongRunCompetitiveEquilibriumVisualization`.

#### Perfect competition market firm

Type `PERFECT_COMPETITION_MARKET_FIRM`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3a1d80f9c04a.js` → `PerfectCompetitionMarketFirmVisualization`.

#### Period frequency relation: `f = \frac{1}{T}`

Type `PERIOD_FREQUENCY_RELATION` · manifest v2 · formula `f = \frac{1}{T}`, also `T = \frac{1}{f}`, `T = 1 / f`, `1/t=f`, `1/f=t`, `t=2pi/omega`, `2pi/omega=t`, `tau=60/nz`, `60/nz=tau`.

Parameters: `period` (number, default `2`, range 0.01 to 1000).

Source: manifest `type-af2e2029147a.js`; view `visualization-8337b5b18425.js` → `PeriodFrequencyRelationVisualization`.

#### Periodic table explorer

Type `PERIODIC_TABLE_EXPLORER`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f739f69da687.js` → `PeriodicTableVisualization`.

#### Periodic trends

Type `PERIODIC_TRENDS` · manifest v2.

Parameters: `initial_trend` (enum, default `atomic radius`, one of `atomic radius`, `first ionization energy`, `electronegativity`).

Source: manifest `type-5d4a85edaa4f.js`; view `visualization-9271c186e149.js` → `Visualization`.

#### Permutation formula

Type `PERMUTATION_FORMULA` · manifest v3.

Parameters: `n` (integer, default `6`, range 4 to 8); `r` (integer, default `3`, range 2 to 4).

Source: manifest `type-1af4bc023ce6.js`; view `visualization-88b63d0ec033.js` → `PermutationFormulaVisualization`.

#### Permutations vs combinations

Type `PERMUTATIONS_VS_COMBINATIONS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-643916f21250.js` → `PermutationsVsCombinationsVisualization`.

#### Perpendicular line

Type `PERPENDICULAR_LINE` · manifest v4.

Parameters: `slope` (number, default `2`, range -10000 to 10000); `intercept` (number, default `1`, range -10000 to 10000); `perpendicularIntercept` (number, default `-2`, range -10000 to 10000).

Source: manifest `type-edfc78ae68b7.js`; view `visualization-8d79af68049a.js` → `PerpendicularLineVisualization`.

#### Pesticide treadmill

Pesticide treadmill stage

Type `PESTICIDE_TREADMILL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-682a54e398a7.js` → `PesticideTreadmillVisualization`.

#### Ph from concentration: `\mathrm{pH}=-\log_{10}([\mathrm{H_3O^+}])`

Hydronium concentration in moles per liter

Type `PH_FROM_CONCENTRATION` · manifest v2 · formula `\mathrm{pH}=-\log_{10}([\mathrm{H_3O^+}])`.

Parameters: `hydronium_concentration_molar` (number, default `1e-7`, range 1e-12 to 0.01).

Source: manifest `type-5afefdccef0f.js`; view `visualization-d430d22c5d92.js` → `PhFromConcentrationVisualization`.

#### Pharmacokinetic curve

Type `PHARMACOKINETIC_CURVE` · manifest v4.

Parameters: `dose_mg` (number, default `240`, range 80 to 400); `elimination_half_life_hours` (number, default `6`, range 2 to 10); `minimum_effective_concentration` (number, default `1.5`, range 0.8 to 2.5); `minimum_toxic_concentration` (number, default `5.5`, range 4 to 8).

Source: manifest `type-a0444b690340.js`; view `visualization-1211dfbb9227.js` → `PharmacokineticCurveVisualization`.

#### Phase change cycle

Phase change

Type `PHASE_CHANGE_CYCLE` · manifest v2.

Parameters: `initial_transition` (enum, default `melting`, one of `melting`, `freezing`, `vaporization`, `condensation`, `sublimation`, `deposition`).

Source: manifest `model-f0617ef38ba2.js`; view `visualization-25d64491a2dd.js` → `PhaseChangeCycleVisualization`.

#### Phase diagram

Type `PHASE_DIAGRAM`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a926917a00c1.js` → `PhaseDiagramVisualization`.

#### Phillips curve

Aggregate demand strength

Type `PHILLIPS_CURVE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3ffa5527d058.js` → `PhillipsCurveVisualization`.

#### Phillips curve shifts

Type `PHILLIPS_CURVE_SHIFTS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ab4df4f9f780.js` → `PhillipsCurveShiftsVisualization`.

#### Phosphorus cycle

Phosphorus-cycle process

Type `PHOSPHORUS_CYCLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6b88cfc6c445.js` → `PhosphorusCycleVisualization`.

#### Photochemical smog

Time of day

Type `PHOTOCHEMICAL_SMOG`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-c87c9374e3ce.js` → `PhotochemicalSmogVisualization`.

#### Photoelectric energy balance: `hf = \phi + K_{\max}`

Light frequency

Type `PHOTOELECTRIC_ENERGY_BALANCE` · manifest v1 · formula `hf = \phi + K_{\max}`.

Parameters: `frequencyTimes10To14Hertz` (number, default `8`, range 3 to 15); `intensityPercent` (number, default `50`, range 10 to 100); `workFunctionElectronVolts` (number, default `2.3`, range 1.5 to 6).

Source: manifest `type-389cfab21292.js`; view `visualization-c6d8f5dd9449.js` → `PhotoelectricEnergyBalanceVisualization`.

#### Photoelectron spectrum

Select an element

Type `PHOTOELECTRON_SPECTRUM`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-2f9804963bc8.js` → `Visualization`.

#### Photosynthesis

{label} value

Type `PHOTOSYNTHESIS` · manifest v4.

Parameters: `lightIntensity` (enum, default `low`, one of `low`, `medium`, `high`); `carbonDioxide` (enum, default `low`, one of `low`, `medium`, `high`); `water` (enum, default `low`, one of `low`, `medium`, `high`).

Source: manifest `type-b4bcce60d760.js`; view `visualization-36140d14d9da.js` → `PhotosynthesisVisualization`.

#### Photosynthesis overview: `6CO_2 + 6H_2O + \text{light energy} \rightarrow C_6H_{12}O_6 + 6O_2`

Photosynthesis stage focus

Type `PHOTOSYNTHESIS_OVERVIEW` · manifest v1 · formula `6CO_2 + 6H_2O + \text{light energy} \rightarrow C_6H_{12}O_6 + 6O_2`.

Parameters: `initial_focus` (enum, default `whole process`, one of `whole process`, `light reactions`, `Calvin cycle`).

Source: manifest `model-7354fd8cc5a6.js`; view `visualization-10700a6a4949.js` → `PhotosynthesisOverviewVisualization`.

#### Photosynthetic pigment spectrum

Visible-light wavelength in nanometres

Type `PHOTOSYNTHETIC_PIGMENT_SPECTRUM`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b3835b41056f.js` → `PhotosyntheticPigmentSpectrumVisualization`.

#### Phototropism

Phototropism response stage

Type `PHOTOTROPISM`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-15d303b662ad.js` → `Visualization`.

#### Phylogenetic tree

{first} and {second}

Type `PHYLOGENETIC_TREE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7e7a635ea38a.js` → `Visualization`.

#### Physical vs chemical process

Examples

Type `PHYSICAL_VS_CHEMICAL_PROCESS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-43387a6dd793.js` → `Visualization`.

#### Piano chord chart

Chord root family

Type `PIANO_CHORD_CHART` · manifest v2.

Parameters: `root_note` (enum, default `C`, one of `C`, `Db`, `D`, `Eb`, `E`, `F`, `F#`, `G`, `Ab`, `A`, `Bb`, `B`); `quality` (enum, default `major`, one of `major`, `minor`).

Source: manifest `type-f409ad2953b1.js`; view `visualization-40c2e00a7b23.js` → `Visualization`.

#### Piano keyboard note names

Selected piano key

Type `PIANO_KEYBOARD_NOTE_NAMES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1b1daeed6682.js` → `Visualization`.

#### Piano roll

Type `PIANO_ROLL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-5c642d554053.js` → `PianoRollVisualization`.

#### Place value

Whole number

Type `PLACE_VALUE` · manifest v2.

Parameters: `number` (integer, default `2654`, range 0 to 9999).

Source: manifest `type-3be9f9a369b1.js`; view `visualization-3385dfe3d0d4.js` → `PlaceValueVisualization`.

#### Plant anatomy

Plant organ

Type `PLANT_ANATOMY` · manifest v2.

Parameters: `initial_organ` (enum, default `root`, one of `root`, `stem`, `leaf`); `initial_transport_tissue` (enum, default `xylem`, one of `xylem`, `phloem`).

Source: manifest `type-a2c1e373aef7.js`; view `visualization-9761d818fdd1.js` → `Visualization`.

#### Plant life cycle

Plant life-cycle stage

Type `PLANT_LIFE_CYCLE` · manifest v2.

Parameters: `initial_stage` (enum, default `germination`, one of `germination`, `seedling`, `mature flowering plant`, `pollination`, `seed formation`, `seed dispersal`).

Source: manifest `model-9badbb3726c5.js`; view `visualization-f1e96040fa83.js` → `PlantLifeCycleVisualization`.

#### Plant vs animal cell

Type `PLANT_VS_ANIMAL_CELL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-861167cee2a5.js` → `Visualization`.

#### Plate boundaries

Plate boundary type

Type `PLATE_BOUNDARIES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4ad45b131ec6.js` → `Visualization`.

#### Point slope line: `y - y_1 = m(x - x_1)`

Type `POINT_SLOPE_LINE` · manifest v2 · formula `y - y_1 = m(x - x_1)`.

Parameters: `x1` (number, default `-3`, range -100 to 100); `y1` (number, default `-2`, range -100 to 100); `slope` (number, default `0.75`, range -20 to 20).

Source: manifest `type-27959fdf7d51.js`; view `visualization-4d46fbc484fa.js` → `PointSlopeLineVisualization`.

#### Point to plane distance: `d = PH`

Type `POINT_TO_PLANE_DISTANCE` · manifest v2 · formula `d = PH`.

Parameters: `pointX` (number, default `1.5`, range -3 to 3); `pointY` (number, default `4`, range 2 to 5.5); `planeAngleDegrees` (number, default `-10`, range -25 to 25).

Source: manifest `type-96ed8dbb8a85.js`; view `visualization-9e24c0bb09d2.js` → `PointToPlaneDistanceVisualization`.

#### Poisson distribution: `P(X=k)=\frac{e^{-\lambda}\lambda^k}{k!}`

Expected events in the interval

Type `POISSON_DISTRIBUTION` · manifest v2 · formula `P(X=k)=\frac{e^{-\lambda}\lambda^k}{k!}`.

Parameters: `lambda` (number, default `5`, range 0.5 to 20); `count` (integer, default `5`, range 0 to 40).

Source: manifest `model-253b6086c636.js`; view `visualization-c71f41eabfce.js` → `PoissonDistributionVisualization`.

#### Polar curves

Type `POLAR_CURVES` · manifest v1.

Parameters: `offset` (number, default `1`, range 0 to 2); `amplitude` (number, default `2`, range 0 to 2).

Source: manifest `model-eb52e6c3fc55.js`; view `visualization-983b323e11cd.js` → `PolarCurvesVisualization`.

#### Polar double integral

Type `POLAR_DOUBLE_INTEGRAL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ee9a31e031ff.js` → `PolarDoubleIntegralVisualization`.

#### Polygon interior angle sum: `(n - 2)\times 180^\circ`

Type `POLYGON_INTERIOR_ANGLE_SUM` · manifest v2 · formula `(n - 2)\times 180^\circ`, also `(n - 2) \times 180^\circ`, `S_n = (n - 2) \cdot 180^\circ`, `S_n = (n - 2)(180^\circ)`, `S_n=(n-2)\cdot(180)`, `180^\circ(n-2)`.

Parameters: `n` (number, default `6`, range 3 to 50).

Source: manifest `type-e574ac8a1abb.js`; view `visualization-2c9ffc689540.js` → `PolygonInteriorAngleSumVisualization`.

#### Polymerization

Alkene monomer

Type `POLYMERIZATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7f85a75970ce.js` → `Visualization`.

#### Polynomial multiplicity intercepts: `f(x) = k(x-r_1)^{m_1}(x-r_2)^{m_2}`

Type `POLYNOMIAL_MULTIPLICITY_INTERCEPTS` · manifest v2 · formula `f(x) = k(x-r_1)^{m_1}(x-r_2)^{m_2}`.

Parameters: `rootCenter` (number, default `0`, range -2 to 2); `rootSeparation` (number, default `4`, range 1 to 4); `leftRootMultiplicity` (integer, default `2`, range 1 to 3); `rightRootMultiplicity` (integer, default `3`, range 1 to 3).

Source: manifest `model-397adfbb4078.js`; view `visualization-1ac7fb212294.js` → `PolynomialMultiplicityInterceptsVisualization`.

#### Polyprotic titration

Equivalents of strong base added

Type `POLYPROTIC_TITRATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-cdbf89ff9438.js` → `Visualization`.

#### Population density: `D = \frac{P}{A}`

Population

Type `POPULATION_DENSITY` · manifest v2 · formula `D = \frac{P}{A}`.

Parameters: `population` (integer, default `500000`, range 1000 to 1000000); `landAreaSquareKilometers` (number, default `100`, range 5 to 1000).

Source: manifest `model-72ba9b7b6395.js`; view `visualization-8db9a3e6aecd.js` → `PopulationDensityVisualization`.

#### Positive externality

Marginal external benefit

Type `POSITIVE_EXTERNALITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-8f1883fa18de.js` → `PositiveExternalityVisualization`.

#### Positive feedback loop

Feedback example

Type `POSITIVE_FEEDBACK_LOOP` · manifest v2.

Parameters: `example` (enum, default `childbirth`, one of `childbirth`, `ice-albedo`).

Source: manifest `model-1d9447e10398.js`; view `visualization-7f8a2a4e1202.js` → `PositiveFeedbackVisualization`.

#### Ppc growth

Type `PPC_GROWTH` · manifest v2.

Parameters: `capacity_change_percent` (number, default `15`, range -40 to 30).

Source: manifest `type-358342ea04f6.js`; view `visualization-62c1914b55d2.js` → `PpcGrowthVisualization`.

#### Ppc opportunity cost

Type `PPC_OPPORTUNITY_COST` · manifest v3.

Parameters: `extraWheat` (number, default `5`, range 0.5 to 6).

Source: manifest `model-7f6fce9d5547.js`; view `visualization-dfaa23ab7db2.js` → `Visualization`.

#### Precipitation reactions

Reactants

Type `PRECIPITATION_REACTIONS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a353fd6612cd.js` → `PrecipitationReactionsVisualization`.

#### Predator prey cycle

Predator-prey cycle phase

Type `PREDATOR_PREY_CYCLE` · manifest v3.

Parameters: `population_pair` (enum, default `hare-and-lynx`, one of `hare-and-lynx`, `rabbit-and-fox`, `generic-prey-and-predator`).

Source: manifest `type-3465f183219c.js`; view `visualization-f92564a9f22a.js` → `PredatorPreyCycleVisualization`.

#### Predator prey dynamics

Starting balance

Type `PREDATOR_PREY_DYNAMICS` · manifest v4.

Parameters: `initial_prey_abundance` (number, default `1.4`, range 0.65 to 1.4); `initial_predator_abundance` (number, default `0.65`, range 0.65 to 1.4).

Source: manifest `model-cec47be50a46.js`; view `visualization-ac3d544e1524.js` → `PredatorPreyVisualization`.

#### Presbyopia

Type `PRESBYOPIA` · manifest v3.

Parameters: `condition` (enum, default `presbyopia`, one of `typical`, `presbyopia`); `objectDistanceCentimeters` (number, default `35`, range 25 to 200).

Source: manifest `model-cb61e61a81ef.js`; view `visualization-ecad540f7980.js` → `PresbyopiaVisualization`.

#### Present value discounting

Type `PRESENT_VALUE_DISCOUNTING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-c82a03bb863c.js` → `PresentValueDiscountingVisualization`.

#### Pressure: `P = \frac{F}{A}`

Type `PRESSURE` · manifest v2 · formula `P = \frac{F}{A}`, also `P = F/A`, `F = PA`, `A = F/P`.

Parameters: `forceNewtons` (number, default `100`, range 0 to 200); `areaSquareMeters` (number, default `2`, range 0.25 to 5).

Source: manifest `type-e210bd3bc009.js`; view `visualization-c835f66be907.js` → `PressureVisualization`.

#### Price ceilings and floors

Type `PRICE_CEILINGS_AND_FLOORS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b86d61faaf47.js` → `PriceCeilingsAndFloorsVisualization`.

#### Price discrimination

Pricing mode

Type `PRICE_DISCRIMINATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-bab8315f9e68.js` → `PriceDiscriminationVisualization`.

#### Primary vs secondary pollutants

Formation pathway

Type `PRIMARY_VS_SECONDARY_POLLUTANTS` · manifest v3.

Parameters: `initial_pathway` (enum, default `photochemical-smog`, one of `photochemical-smog`, `secondary-particles`).

Source: manifest `model-5ba45a3a952c.js`; view `visualization-ed71dba6b8e6.js` → `PrimaryVsSecondaryPollutantsVisualization`.

#### Primes

Type `PRIMES` · manifest v2.

Parameters: `number` (integer, default `100`, range 2 to 1000).

Source: manifest `model-24b2fb9cdc75.js`; view `visualization-cb268c039ef7.js` → `PrimesVisualization`.

#### Probability intersection

Type `PROBABILITY_INTERSECTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b3e7663a267f.js` → `ProbabilityIntersectionVisualization`.

#### Probability tree

Choose sampling mode

Type `PROBABILITY_TREE` · manifest v2.

Parameters: `first_outcome_count` (integer, default `3`, range 1 to 12); `second_outcome_count` (integer, default `8`, range 1 to 12); `with_replacement` (boolean, default `false`).

Source: manifest `type-bb80ea70b787.js`; view `visualization-8cb24f6b5ebb.js` → `ProbabilityTreeVisualization`.

#### Process capability cp cpk

Process mean

Type `PROCESS_CAPABILITY_CP_CPK` · manifest v3.

Parameters: `lower_specification_limit` (number, default `90`, range 80 to 95); `upper_specification_limit` (number, default `110`, range 105 to 120); `process_mean` (number, default `100`, range 80 to 120); `process_standard_deviation` (number, default `2.5`, range 1 to 4).

Source: manifest `model-9f44ebe8bcfd.js`; view `visualization-977560988755.js` → `ProcessCapabilityVisualization`.

#### Production function

Type `PRODUCTION_FUNCTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d0f99595ad85.js` → `ProductionFunctionVisualization`.

#### Production possibilities frontier

Type `PRODUCTION_POSSIBILITIES_FRONTIER` · manifest v5.

Parameters: `wheat` (number, default `4`, range 0 to 9); `computers` (number, default `4`, range 0 to 9).

Source: manifest `type-f06e3a1bfe5a.js`; view `visualization-9c884a73ace7.js` → `Visualization`.

#### Projectile motion

Type `PROJECTILE_MOTION` · manifest v4.

Parameters: `initialSpeedMetersPerSecond` (number, default `18`, range 12 to 25); `launchAngleDegrees` (number, default `45`, range 25 to 65).

Source: manifest `model-7239f4550c95.js`; view `visualization-9e07b38d6cff.js` → `ProjectileMotionVisualization`.

#### Prokaryotic vs eukaryotic cells

Select a cell feature focus

Type `PROKARYOTIC_VS_EUKARYOTIC_CELLS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7d226046f3d0.js` → `Visualization`.

#### Protein denaturation

Environmental stress

Type `PROTEIN_DENATURATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1a187bfd680a.js` → `ProteinDenaturationVisualization`.

#### Protein structure levels

Protein structure level

Type `PROTEIN_STRUCTURE_LEVELS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6ca381729fd3.js` → `ProteinStructureVisualization`.

#### Proton nmr splitting

Select the number of equivalent neighboring protons

Type `PROTON_NMR_SPLITTING` · manifest v3.

Parameters: `neighbor_count` (enum, default `2`, one of `0`, `1`, `2`, `3`, `4`, `6`).

Source: manifest `type-ec08a0c3755f.js`; view `visualization-75be33054dc6.js` → `Visualization`.

#### Pulmonary surfactant and compliance

Lung condition

Type `PULMONARY_SURFACTANT_AND_COMPLIANCE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-234f62f6c0ef.js` → `Visualization`.

#### Punnett squares

Type `PUNNETT_SQUARES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-93299e7799c9.js` → `PunnettSquareVisualization`.

#### Pupillary light reflex

Type `PUPILLARY_LIGHT_REFLEX`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4db1fae07502.js` → `PupillaryLightReflexVisualization`.

#### Pv nrt equation: `PV = nRT`

Type `PV_NRT_EQUATION` · manifest v4 · formula `PV = nRT`, also `P V = n R T`, `P = nRT / V`, `P = \frac{nRT}{V}`, `V = nRT / P`, `V = \frac{nRT}{P}`, `n = PV / RT`, `n = \frac{PV}{RT}`, `T = PV / nR`, `T = \frac{PV}{nR}`, `R = PV / nT`, `R = \frac{PV}{nT}`.

Parameters: `P` (number, default `1`, range 0.01 to 100); `V` (number, default `24`, range 0.01 to 10000); `n` (number, default `1`, range 0.01 to 1000); `T` (number, default `298`, range 1 to 5000); `solveFor` (enum, default `P`, one of `P`, `V`, `n`, `T`).

Source: manifest `type-545469cf1dee.js`; view `visualization-1f4d26cdc44f.js` → `PVNRTVisualization`.

#### Pythagorean theorem: `a^2 + b^2 = c^2`

Type `PYTHAGOREAN_THEOREM` · manifest v4 · formula `a^2 + b^2 = c^2`, also `c^2 = a^2 + b^2`, `c = \sqrt{a^2 + b^2}`, `c = \sqrt{(a^2 + b^2)}`.

Parameters: `a` (number, default `15`, range 0.01 to 10000); `b` (number, default `15`, range 0.01 to 10000).

Source: manifest `type-8d5332dc0d4a.js`; view `visualization-9a04aac0b706.js` → `PythagoreanVisualization`.

#### Python range for loop

Type `PYTHON_RANGE_FOR_LOOP` · manifest v3.

Parameters: `start` (integer, default `2`, range -4 to 10); `stop` (integer, default `10`, range -4 to 10); `step` (integer, default `2`, range -4 to 4).

Source: manifest `model-5a0d6a0ec95c.js`; view `visualization-9bb793187bbf.js` → `PythonRangeForLoopVisualization`.

#### Q vs k

Q is less than K

Type `Q_VS_K` · manifest v3.

Parameters: `equilibrium_constant` (number, default `1`, range 1e-100 to 1e+100); `initial_reaction_quotient` (number, default `0.1`, range 0 to 1e+101).

Source: manifest `model-aa3adbeb5d62.js`; view `visualization-6fd6e04de8c4.js` → `QVsKVisualization`.

#### Qt prolongation torsades

Corrected QT interval

Type `QT_PROLONGATION_TORSADES` · manifest v2.

Parameters: `qtcMs` (number, default `420`, range 360 to 560).

Source: manifest `type-2cfafbf12fe5.js`; view `visualization-ebcc7f0190b2.js` → `QTProlongationV2Visualization`.

#### Quadratic formula: `x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`

Type `QUADRATIC_FORMULA` · manifest v4 · formula `x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`, also `x = (-b \pm \sqrt{b^2 - 4ac})/(2a)`.

Parameters: `a` (number, default `1`, range -5 to 5); `b` (number, default `0`, range -5 to 5); `c` (number, default `-4`, range -5 to 5).

Source: manifest `type-46bd62c7daa0.js`; view `visualization-eaa083f0aba6.js` → `QuadraticFormulaVisualization`.

#### Quadratic inequalities: `ax^2 + bx + c > 0`

{operator} zero

Type `QUADRATIC_INEQUALITIES` · manifest v2 · formula `ax^2 + bx + c > 0`.

Parameters: `a` (number, default `1`, range 0.1 to 10); `b` (number, default `-1`, range -20 to 20); `c` (number, default `-6`, range -20 to 20); `operator` (enum, default `>`, one of `>`, `<`, `>=`, `<=`).

Source: manifest `model-dcf2f0fdafb4.js`; view `visualization-e7c25b92ae5d.js` → `QuadraticInequalitiesVisualization`.

#### Quadratic vertex form: `y = a(x - h)^2 + k`

Type `QUADRATIC_VERTEX_FORM` · manifest v3 · formula `y = a(x - h)^2 + k`.

Parameters: `h` (number, default `0`, range -5 to 5); `k` (number, default `0`, range -5 to 5).

Source: manifest `model-870129d9ea20.js`; view `visualization-1ce1adadfda8.js` → `QuadraticVertexFormVisualization`.

#### Quicksort

Starting arrangement

Type `QUICKSORT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-526df1e7ee64.js` → `QuicksortVisualization`.

#### Raas and adh

RAAS and ADH causal stage

Type `RAAS_AND_ADH` · manifest v2.

Parameters: `initial_condition` (enum, default `volume loss`, one of `normal`, `volume loss`, `increased osmolality`).

Source: manifest `model-f92e3f01a456.js`; view `visualization-3d55e7aa0347.js` → `Visualization`.

#### Radiation penetration

Shielding stage

Type `RADIATION_PENETRATION` · manifest v2.

Parameters: `initial_shielding` (enum, default `lead-or-concrete`, one of `none`, `paper`, `aluminium-or-plastic`, `lead-or-concrete`).

Source: manifest `type-7a83abf1c6c4.js`; view `visualization-588a3c5042c1.js` → `RadiationPenetrationVisualization`.

#### Radiometric dating

Type `RADIOMETRIC_DATING` · manifest v4.

Parameters: `isotope_system` (enum, default `carbon-14-to-nitrogen-14`, one of `carbon-14-to-nitrogen-14`, `potassium-40-to-argon-40`, `uranium-238-to-lead-206`).

Source: manifest `model-d7a1e636d00a.js`; view `visualization-7fcc28b09490.js` → `RadiometricDatingVisualization`.

#### Rain shadow effect

Type `RAIN_SHADOW_EFFECT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4c893a545eba.js` → `RainShadowVisualization`.

#### Randomized controlled trial flow

Trial phase

Type `RANDOMIZED_CONTROLLED_TRIAL_FLOW`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d4a2c6d2fccc.js` → `Visualization`.

#### Randomized experiment

Experiment stage

Type `RANDOMIZED_EXPERIMENT` · manifest v2.

Parameters: `experimental_units` (integer, default `16`, range 6 to 30); `treatment_effect` (number, default `8`, range -20 to 20).

Source: manifest `type-b2315d4b532d.js`; view `visualization-d9d0a0526d8e.js` → `RandomizedExperimentVisualization`.

#### Rates and bonds

Type `RATES_AND_BONDS` · manifest v1.

Parameters: `yieldChangePercentagePoints` (number, default `0`, range -3 to 3).

Source: manifest `model-57ce9234be9d.js`; view `visualization-872fc567b5b8.js` → `RatesAndBondsVisualization`.

#### Rational inequality sign chart

Step 1: Find critical values

Type `RATIONAL_INEQUALITY_SIGN_CHART`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-8d5896ae11b4.js` → `RationalInequalitySignChartVisualization`.

#### Rational limits at infinity: `\lim_{x\to\pm\infty}\left(f(x)-q(x)\right)=0`

Numerator leading coefficient {variable}

Type `RATIONAL_LIMITS_AT_INFINITY` · manifest v1 · formula `\lim_{x\to\pm\infty}\left(f(x)-q(x)\right)=0`.

Parameters: `numeratorDegree` (integer, default `1`, range 0 to 3); `denominatorDegree` (integer, default `2`, range 1 to 3); `numeratorLeadingCoefficient` (number, default `2`, range 0.5 to 5); `denominatorLeadingCoefficient` (number, default `1`, range 0.5 to 5).

Source: manifest `model-65944a036c44.js`; view `visualization-e2d917ea8b42.js` → `RationalLimitsAtInfinityVisualization`.

#### Reaction order plots

Reaction order

Type `REACTION_ORDER_PLOTS` · manifest v3.

Parameters: `reaction_order` (enum, default `first-order`, one of `zero-order`, `first-order`, `second-order`).

Source: manifest `type-d93f8783cbfc.js`; view `visualization-f84ec63feb7f.js` → `ReactionOrderPlotsVisualization`.

#### Reaction rate over time

Observed species

Type `REACTION_RATE_OVER_TIME` · manifest v4.

Parameters: `observed_species` (enum, default `reactant`, one of `reactant`, `product`).

Source: manifest `model-501467f4520d.js`; view `visualization-c9e77c5d59ec.js` → `ReactionRateVisualization`.

#### Reaction thermodynamics: `\Delta H = H_{\mathrm{products}} - H_{\mathrm{reactants}}`

Forward activation energy

Type `REACTION_THERMODYNAMICS` · manifest v3 · formula `\Delta H = H_{\mathrm{products}} - H_{\mathrm{reactants}}`.

Parameters: `activationEnergyKilojoulesPerMole` (number, default `90`, range 50 to 150); `enthalpyChangeKilojoulesPerMole` (number, default `-30`, range -60 to 40).

Source: manifest `type-f44192a3e2d7.js`; view `visualization-c04d99c56720.js` → `ReactionThermodynamicsVisualization`.

#### Reaction type explorer

Type `REACTION_TYPE_EXPLORER`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b508b7b063d4.js` → `ReactionTypeExplorerVisualization`.

#### Recrystallization purification

Low cold solubility

Type `RECRYSTALLIZATION_PURIFICATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-161c4bc24cad.js` → `RecrystallizationVisualization`.

#### Rectangle area

Type `RECTANGLE_AREA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-79a400b296b4.js` → `RectangleAreaVisualization`.

#### Rectangular prism volume

Type `RECTANGULAR_PRISM_VOLUME`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-81fef0fb8dc1.js` → `RectangularPrismVolumeVisualization`.

#### Redox electron transfer

Reaction stage

Type `REDOX_ELECTRON_TRANSFER`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-e311bb28ca9c.js` → `Visualization`.

#### Reflection transformation coordinate plane

Point

Type `REFLECTION_TRANSFORMATION_COORDINATE_PLANE` · manifest v3.

Parameters: `objectMode` (enum, default `triangle`, one of `point`, `triangle`); `reflectionLine` (enum, default `y_equals_x`, one of `x_axis`, `y_axis`, `y_equals_x`, `y_equals_negative_x`); `ax` (number, default `-3.5`, range -5.5 to 5.5); `ay` (number, default `0.25`, range -5.5 to 5.5); `triangleCenterX` (number, default `-2`, range -2 to 2); `triangleCenterY` (number, default `1`, range -2 to 2); `triangleWidth` (number, default `3`, range 1 to 4); `triangleHeight` (number, default `2.5`, range 1 to 4); `triangleRotationDegrees` (number, default `0`, range -90 to 90).

Source: manifest `model-965ba7ea53bb.js`; view `visualization-3a0c490458e9.js` → `ReflectionTransformationCoordinatePlaneVisualization`.

#### Reorder point and safety stock

Type `REORDER_POINT_AND_SAFETY_STOCK` · manifest v3.

Parameters: `initialInventory` (number, default `240`, range 220 to 300); `demandRateUnitsPerDay` (number, default `20`, range 20 to 40); `leadTimeDays` (number, default `4`, range 2 to 4); `safetyStock` (number, default `40`, range 20 to 60).

Source: manifest `model-63190570fb43.js`; view `visualization-b27719ab5e76.js` → `ReorderPointAndSafetyStockVisualization`.

#### Resistors in parallel equivalent: `\frac{1}{R_T} = \frac{1}{R_1} + \frac{1}{R_2} + \frac{1}{R_3}`

Type `RESISTORS_IN_PARALLEL_EQUIVALENT` · manifest v4 · formula `\frac{1}{R_T} = \frac{1}{R_1} + \frac{1}{R_2} + \frac{1}{R_3}`, also `\frac{1}{R_T} = \frac{1}{R_1} + \frac{1}{R_2}`, `\frac{1}{R_{\text{eq}}} = \frac{1}{R_1} + \frac{1}{R_2} + \frac{1}{R_3}`.

Parameters: `r1` (number, default `8`, range 0.1 to 100000); `r2` (number, default `8`, range 0.1 to 100000); `r3` (number, default `8`, range 0.1 to 100000); `voltage` (number, default `12`, range 0 to 1000).

Source: manifest `type-1994a14ca218.js`; view `visualization-332f5a30246b.js` → `ResistorsInParallelEquivalentVisualization`.

#### Resistors in series equivalent: `R_{\text{total}} = R_1 + R_2 + \dots`

Type `RESISTORS_IN_SERIES_EQUIVALENT` · manifest v4 · formula `R_{\text{total}} = R_1 + R_2 + \dots`, also `R_{\text{eq}} = R_1 + R_2 + R_3`, `R_T = R_1 + R_2 + R_3`, `R_{eq} = R_1 + R_2 + R_3`.

Parameters: `r1` (number, default `8`, range 0.1 to 100000); `r2` (number, default `8`, range 0.1 to 100000); `r3` (number, default `8`, range 0.1 to 100000); `voltage` (number, default `12`, range 0 to 1000).

Source: manifest `type-ff1e86d5dbe7.js`; view `visualization-788f258d5995.js` → `ResistorsInSeriesEquivalentVisualization`.

#### Resonance structures

Resonance example

Type `RESONANCE_STRUCTURES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-b65bb1562604.js` → `Visualization`.

#### Rest value chart

Choose a rest value to compare

Type `REST_VALUE_CHART`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-25dce5e8cf15.js` → `Visualization`.

#### Restriction enzyme map

Restriction digest

Type `RESTRICTION_ENZYME_MAP` · manifest v3.

Parameters: `molecule_topology` (enum, default `circular plasmid`, one of `circular plasmid`, `linear DNA`).

Source: manifest `model-6e039b1d844f.js`; view `visualization-89b2a4767e39.js` → `Visualization`.

#### Rgb additive mixing

Red channel level

Type `RGB_ADDITIVE_MIXING` · manifest v3.

Parameters: `red` (integer, default `255`, range 0 to 255); `green` (integer, default `255`, range 0 to 255); `blue` (integer, default `255`, range 0 to 255).

Source: manifest `type-8b177dd67695.js`; view `visualization-2caebd519595.js` → `RgbAdditiveMixingVisualization`.

#### Riemann sums

Type `RIEMANN_SUMS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7e174d0e4ea7.js` → `IntegrationEstimationVisualization`.

#### Right triangle

Type `RIGHT_TRIANGLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-49a14fc6dc64.js` → `RightTriangleVisualization`.

#### Rna processing

Type `RNA_PROCESSING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a14809494180.js` → `Visualization`.

#### Roc curve

Area under the ROC curve

Type `ROC_CURVE` · manifest v3.

Parameters: `auroc` (number, default `0.75`, range 0.5 to 0.95); `threshold` (number, default `0.5`, range 0 to 1).

Source: manifest `type-c65766b09e91.js`; view `visualization-47af09d091c3.js` → `RocCurveVisualization`.

#### Rock cycle

Starting material

Type `ROCK_CYCLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7107e8f04a8f.js` → `RockCycleVisualization`.

#### Rods cones light levels

Type `RODS_CONES_LIGHT_LEVELS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7a0247511a91.js` → `RodsConesLightLevelsVisualization`.

#### Rolles theorem: `f(a)=f(b)\implies\exists\,c\in(a,b):f'(c)=0`

Type `ROLLES_THEOREM` · manifest v3 · formula `f(a)=f(b)\implies\exists\,c\in(a,b):f'(c)=0`.

Parameters: `endpointY` (number, default `-2`, range -10 to 10); `vertexOffset` (number, default `6`, range -10 to 10).

Source: manifest `model-d7d56680b09d.js`; view `visualization-ad094d28b2b1.js` → `RollesTheoremVisualization`.

#### Root power equivalence

Type `ROOT_POWER_EQUIVALENCE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ffea1edb2822.js` → `RootPowerEquivalenceVisualization`.

#### Rotation transformation coordinate plane

Type `ROTATION_TRANSFORMATION_COORDINATE_PLANE` · manifest v4.

Parameters: `angleDeg` (number, default `90`, range -180 to 180).

Source: manifest `model-50addbd68e43.js`; view `visualization-9e0dad670640.js` → `RotationTransformationCoordinatePlaneVisualization`.

#### Round robin cpu scheduling

Time quantum

Type `ROUND_ROBIN_CPU_SCHEDULING` · manifest v2.

Parameters: `time_quantum` (integer, default `3`, range 1 to 8); `workload` (enum, default `mixed-bursts`, one of `mixed-bursts`, `one-long-two-short`, `equal-bursts`).

Source: manifest `model-5fdbc0dfab74.js`; view `visualization-1fa684521997.js` → `RoundRobinCpuSchedulingVisualization`.

#### Rutherford gold foil experiment

Choose the atomic model

Type `RUTHERFORD_GOLD_FOIL_EXPERIMENT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-65739558fcda.js` → `Visualization`.

#### Saltwater intrusion

Type `SALTWATER_INTRUSION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-2d9e8829fa93.js` → `Visualization`.

#### Sample space grid

Type `SAMPLE_SPACE_GRID` · manifest v2.

Parameters: `event` (enum, default `sum equals 7`, one of `sum equals 5`, `sum equals 7`, `sum at least 10`, `matching values`).

Source: manifest `model-f4dbaa3dfc38.js`; view `visualization-7e6cf56f084b.js` → `SampleSpaceGridVisualization`.

#### Sample variance

Type `SAMPLE_VARIANCE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-274b3ed90506.js` → `SampleVarianceVisualization`.

#### Sampling distribution

Population shape

Type `SAMPLING_DISTRIBUTION` · manifest v3.

Parameters: `population_shape` (enum, default `normal`, one of `normal`, `right-skewed`); `population_mean` (number, default `50`, range -10000 to 10000); `population_standard_deviation` (number, default `12`, range 0.1 to 1000); `sample_size` (integer, default `10`, range 2 to 100).

Source: manifest `model-935d6fe1930e.js`; view `visualization-bc3a0f5672e5.js` → `SamplingDistributionVisualization`.

#### Sampling without replacement

First-draw branch to inspect

Type `SAMPLING_WITHOUT_REPLACEMENT` · manifest v3.

Parameters: `category_a_count` (integer, default `4`, range 1 to 10); `category_b_count` (integer, default `3`, range 1 to 10).

Source: manifest `type-9a0c50e93ce3.js`; view `visualization-b3cf1ef5a831.js` → `SamplingWithoutReplacementVisualization`.

#### Sarcomere structure

Type `SARCOMERE_STRUCTURE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-554efb555695.js` → `SarcomereStructureVisualization`.

#### Saturated vs unsaturated solution

Solid solute added

Type `SATURATED_VS_UNSATURATED_SOLUTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-89922455a63b.js` → `Visualization`.

#### Scalene triangle

Type `SCALENE_TRIANGLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-427411e7a55a.js` → `ScaleneTriangleVisualization`.

#### Scientific notation: `a \times 10^n`

Type `SCIENTIFIC_NOTATION` · manifest v2 · formula `a \times 10^n`.

Parameters: `coefficient` (number, default `2.12`, range 1 to 9.99); `exponent` (integer, default `5`, range -9 to 9).

Source: manifest `model-d8a30bda1b33.js`; view `visualization-51e081ced5de.js` → `ScientificNotationVisualization`.

#### Sea level rise

Observation interval

Type `SEA_LEVEL_RISE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ff60f7b0adde.js` → `Visualization`.

#### Seasons and solar angle

Type `SEASONS_AND_SOLAR_ANGLE` · manifest v3.

Parameters: `latitude_degrees` (number, default `40`, range -80 to 80).

Source: manifest `type-afd9de5814d9.js`; view `visualization-50be61048724.js` → `SeasonsVisualization`.

#### Seed germination

Type `SEED_GERMINATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-fafcb81384d6.js` → `SeedGerminationVisualization`.

#### Segment ratio: `AP:PB=m:n`

Type `SEGMENT_RATIO` · manifest v1 · formula `AP:PB=m:n`.

Parameters: `pointAX` (number, default `-6`, range -10000 to 10000); `pointAY` (number, default `-2`, range -10000 to 10000); `segmentLength` (number, default `14.142135623730951`, range 1 to 10000); `segmentAngleDeg` (number, default `45`, range -180 to 180); `m` (integer, default `2`, range 1 to 12); `n` (integer, default `3`, range 1 to 12).

Source: manifest `type-10f0ea8edfaf.js`; view `visualization-4cb7c8241a70.js` → `SegmentRatioVisualization`.

#### Selection patterns

{pattern} selection panel at {stage}.

Type `SELECTION_PATTERNS` · manifest v3.

Parameters: `initial_selection_pattern` (enum, default `stabilizing`, one of `stabilizing`, `directional`, `disruptive`).

Source: manifest `type-111ad055626d.js`; view `visualization-e2d136c3bb19.js` → `SelectionPatternsVisualization`.

#### Selection sort

Type `SELECTION_SORT` · manifest v2.

Parameters: `order` (enum, default `6,3,8,2,7,1,5,4`, one of `6,3,8,2,7,1,5,4`, `8,7,6,5,4,3,2,1`, `1,2,3,4,5,6,7,8`, `4,1,7,3,8,5,2,6`).

Source: manifest `type-979c1644f178.js`; view `visualization-42e6cc6dc9ab.js` → `SelectionSortVisualization`.

#### Set operations venn regions

Type `SET_OPERATIONS_VENN_REGIONS` · manifest v2.

Parameters: `operation` (enum, default `union`, one of `union`, `intersection`, `a_minus_b`, `b_minus_a`, `a_complement`, `b_complement`).

Source: manifest `model-ec0b6a77f077.js`; view `visualization-5c3b89de8f0f.js` → `SetOperationsVennRegionsVisualization`.

#### Shadow price: `P = 3x + 4y`

Resource limit {variable}

Type `SHADOW_PRICE` · manifest v1 · formula `P = 3x + 4y`.

Parameters: `resourceLimit` (number, default `12`, range 8 to 18).

Source: manifest `model-f675b47b1a69.js`; view `visualization-835899c87026.js` → `ShadowPriceVisualization`.

#### Shutdown decision

Type `SHUTDOWN_DECISION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-70391f48af6b.js` → `ShutdownDecisionVisualization`.

#### Side by side box plots

Comparison-group median

Type `SIDE_BY_SIDE_BOX_PLOTS` · manifest v2.

Parameters: `initial_comparison` (enum, default `same-median-different-iqr`, one of `same-median-different-iqr`, `different-median-same-iqr`, `different-median-different-iqr`).

Source: manifest `model-7b21f981f07c.js`; view `visualization-127e5836ac0e.js` → `SideBySideBoxPlotsVisualization`.

#### Similar triangles

Type `SIMILAR_TRIANGLES` · manifest v3.

Parameters: `scale` (number, default `1.4`, range 0.5 to 2).

Source: manifest `type-57ca60bb3e4c.js`; view `visualization-feb7f2aaa8d9.js` → `SimilarTrianglesVisualization`.

#### Simple division

Type `SIMPLE_DIVISION` · manifest v2.

Parameters: `dividend` (integer, default `14`, range 1 to 30); `divisor` (integer, default `4`, range 1 to 10).

Source: manifest `model-1b1a0d17905e.js`; view `visualization-6544c0f8f1f1.js` → `SimpleDivisionVisualization`.

#### Simple pendulum: `T \approx 2\pi\sqrt{\frac{L}{g}}`

Type `SIMPLE_PENDULUM` · manifest v1 · formula `T \approx 2\pi\sqrt{\frac{L}{g}}`.

Parameters: `lengthMeters` (number, default `1.2`, range 0.5 to 2); `startingAngleDegrees` (number, default `35`, range 5 to 60).

Source: manifest `type-fff8bf6df8e9.js`; view `visualization-99e3709d0bf9.js` → `SimplePendulumVisualization`.

#### Simplified fraction

Type `SIMPLIFIED_FRACTION` · manifest v2.

Parameters: `numerator` (integer, default `6`, range 1 to 12); `denominator` (integer, default `8`, range 4 to 24).

Source: manifest `type-b2d049022561.js`; view `visualization-fa2cd63ee411.js` → `SimplifiedFractionVisualization`.

#### Simpson rule

Type `SIMPSON_RULE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-89ba9373feed.js` → `SimpsonRuleVisualization`.

#### Singly linked list pointers

Type `SINGLY_LINKED_LIST_POINTERS` · manifest v2.

Parameters: `operation` (enum, default `insert`, one of `insert`, `delete`).

Source: manifest `type-bc36333e58e1.js`; view `visualization-7d7fc329e2f9.js` → `SinglyLinkedListPointersVisualization`.

#### Singular value decomposition: `A=U\Sigma V^{\mathsf T}`

Type `SINGULAR_VALUE_DECOMPOSITION` · manifest v1 · formula `A=U\Sigma V^{\mathsf T}`.

Parameters: `rank` (integer, default `2`, range 1 to 4).

Source: manifest `type-3a822ada5784.js`; view `visualization-d21ea9a3f73a.js` → `SingularValueDecompositionVisualization`.

#### Skeleton and muscle movement

Type `SKELETON_AND_MUSCLE_MOVEMENT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ffc31549dcf5.js` → `SkeletonAndMuscleMovementVisualization`.

#### Skewness direction

Type `SKEWNESS_DIRECTION` · manifest v2.

Parameters: `direction` (enum, default `right`, one of `left`, `right`); `skewStrength` (number, default `0.6`, range 0 to 1).

Source: manifest `model-f7b391d4c9ce.js`; view `visualization-9e6695a28e41.js` → `SkewnessDirectionVisualization`.

#### Sleep cycle hypnogram

Type `SLEEP_CYCLE_HYPNOGRAM` · manifest v4.

Parameters: `sleep_duration_hours` (number, default `8`, range 5 to 10).

Source: manifest `model-af359ee5ae9b.js`; view `visualization-9371c824bd3d.js` → `Visualization`.

#### Sliding filament muscle contraction

Calcium absent

Type `SLIDING_FILAMENT_MUSCLE_CONTRACTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-87f32de72ecd.js` → `SlidingFilamentVisualization`.

#### Slope equation

Type `SLOPE_EQUATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-22f08826f51c.js` → `SlopeEquationVisualization`.

#### Slope intercept: `y = mx + b`

Type `SLOPE_INTERCEPT` · manifest v2 · formula `y = mx + b`, also `f(x)=mx+b`, `y = mx + c`.

Parameters: `slope` (number, default `1`, range -10000 to 10000); `intercept` (number, default `5`, range -10000 to 10000).

Source: manifest `type-110ca488953a.js`; view `visualization-37e837ee70c9.js` → `SlopeInterceptVisualization`.

#### Sn1 vs sn2 substitution

Substitution mechanism

Type `SN1_VS_SN2_SUBSTITUTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-cd7f6145fc27.js` → `Visualization`.

#### Soil field capacity and wilting point

Soil-water state

Type `SOIL_FIELD_CAPACITY_AND_WILTING_POINT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3d8a69bba1db.js` → `SoilWaterVisualization`.

#### Soil texture and water retention

Emphasized soil texture

Type `SOIL_TEXTURE_AND_WATER_RETENTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-8722955b2e13.js` → `SoilTextureAndWaterRetentionVisualization`.

#### Soil texture triangle

Sand percentage

Type `SOIL_TEXTURE_TRIANGLE` · manifest v1.

Parameters: `sand_percent` (number, default `40`, range 0 to 100); `clay_percent` (number, default `20`, range 0 to 100).

Source: manifest `type-4ea25b9db993.js`; view `visualization-8f2a06282aef.js` → `Visualization`.

#### Solar photovoltaic system

Available sunlight

Type `SOLAR_PHOTOVOLTAIC_SYSTEM` · manifest v2.

Parameters: `array_capacity_kw` (number, default `6`, range 1 to 20).

Source: manifest `type-f31fc951c570.js`; view `visualization-15e44079bb30.js` → `SolarPhotovoltaicSystemVisualization`.

#### Solenoid internal field: `B = \mu_0 n I`

Clockwise, viewed from the left end

Type `SOLENOID_INTERNAL_FIELD` · manifest v1 · formula `B = \mu_0 n I`.

Parameters: `currentAmperes` (number, default `2`, range 0.5 to 5); `turnsPerMeter` (number, default `500`, range 100 to 1000); `direction` (enum, default `counterclockwise`, one of `clockwise`, `counterclockwise`).

Source: manifest `type-17796e12b6d2.js`; view `visualization-ba1d6fad396b.js` → `SolenoidInternalFieldVisualization`.

#### Solow steady state: `s f(k^*) = (\delta + n + g)k^*`

Type `SOLOW_STEADY_STATE` · manifest v4 · formula `s f(k^*) = (\delta + n + g)k^*`.

Parameters: `savingRatePercent` (number, default `40`, range 20 to 50); `depreciationRatePercent` (number, default `5`, range 4.5 to 10); `populationGrowthRatePercent` (number, default `1.5`, range 1 to 4); `technologyGrowthRatePercent` (number, default `2`, range 1.5 to 4).

Source: manifest `type-3ecced4722ba.js`; view `visualization-7019dfa1f42b.js` → `SolowSteadyStateVisualization`.

#### Solubility curve

Potassium nitrate

Type `SOLUBILITY_CURVE` · manifest v2.

Parameters: `solute` (enum, default `potassium nitrate`, one of `potassium nitrate`, `sodium chloride`, `cerium(III) sulfate`).

Source: manifest `model-17f916a4e975.js`; view `visualization-46b9701da935.js` → `SolubilityCurveVisualization`.

#### Solubility equilibrium

Initial ion product relative to Ksp

Type `SOLUBILITY_EQUILIBRIUM` · manifest v4.

Parameters: `dissolution_stoichiometry` (enum, default `MX`, one of `MX`, `MX2`, `M2X3`); `ksp` (number, default `8.5e-17`, range 1e-18 to 1e-16).

Source: manifest `model-57d17e7a5c30.js`; view `visualization-5e37c79ac1a0.js` → `SolubilityEquilibriumVisualization`.

#### Solution dilution: `M_1V_1=M_2V_2`

Type `SOLUTION_DILUTION` · manifest v1 · formula `M_1V_1=M_2V_2`.

Parameters: `initialConcentrationMolesPerLiter` (number, default `1.5`, range 0.1 to 3); `initialVolumeLiters` (number, default `2`, range 0.5 to 5); `waterAddedLiters` (number, default `3`, range 0 to 5).

Source: manifest `type-b20da9986277.js`; view `visualization-2621f48998d5.js` → `SolutionDilutionVisualization`.

#### Speciation

Speciation stage

Type `SPECIATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ed48ed1fd2df.js` → `SpeciationVisualization`.

#### Specific heat: `\Delta T = \frac{q}{mc}`

{material} sample

Type `SPECIFIC_HEAT` · manifest v1 · formula `\Delta T = \frac{q}{mc}`.

Parameters: `material` (enum, default `water`, one of `copper`, `sand`, `water`); `heatKj` (number, default `40`, range 0 to 60).

Source: manifest `type-34ba530d4dd9.js`; view `visualization-ef834c4794ed.js` → `SpecificHeatVisualization`.

#### Sphere volume: `V = \frac{4}{3}\pi r^3`

Type `SPHERE_VOLUME` · manifest v4 · formula `V = \frac{4}{3}\pi r^3`, also `4/3pir^3=v`, `4/3pir^3`.

Parameters: `radius` (number, default `3`, range 0.01 to 10000).

Source: manifest `type-6b1390f6b07f.js`; view `visualization-25f6661335ae.js` → `SphereVolumeVisualization`.

#### Spreadsheet if function

Type `SPREADSHEET_IF_FUNCTION` · manifest v2.

Parameters: `comparison_operator` (enum, default `>=`, one of `>`, `>=`, `<`, `<=`); `initial_input_value` (number, default `8`, range 0 to 20); `initial_comparison_value` (number, default `10`, range 0 to 20).

Source: manifest `model-379965cd8d4f.js`; view `visualization-69d0ee75ad88.js` → `SpreadsheetIfVisualization`.

#### Spreadsheet text extraction

Choose LEFT, RIGHT, or MID

Type `SPREADSHEET_TEXT_EXTRACTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-affc97cb9007.js` → `Visualization`.

#### Sql ddl vs dml

Type `SQL_DDL_VS_DML`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-64a3a1737e8f.js` → `Visualization`.

#### Sql group by

Type `SQL_GROUP_BY` · manifest v3.

Parameters: `groupBy` (enum, default `country`, one of `country`, `age`).

Source: manifest `model-a061927447b9.js`; view `visualization-d08e5db3804b.js` → `SqlGroupByVisualization`.

#### Sql join

Type `SQL_JOIN` · manifest v2.

Parameters: `joinType` (enum, default `inner`, one of `inner`, `left`, `right`, `full`).

Source: manifest `model-f4de27b0379a.js`; view `visualization-33e0dd4feaa0.js` → `SqlJoinVisualization`.

#### Sql primary foreign key constraints

Insert a child with an existing parent

Type `SQL_PRIMARY_FOREIGN_KEY_CONSTRAINTS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-533a4ba3140e.js` → `Visualization`.

#### Sql transaction commit rollback

Type `SQL_TRANSACTION_COMMIT_ROLLBACK` · manifest v2.

Parameters: `transfer_amount` (number, default `150`, range 25 to 500).

Source: manifest `model-b26f29efe99c.js`; view `visualization-e699f792b0e6.js` → `SqlTransactionVisualization`.

#### Square area

Type `SQUARE_AREA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-396eab4602e7.js` → `SquareAreaVisualization`.

#### Sras

Signed short-run aggregate supply shift

Type `SRAS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-39128e1dc1a1.js` → `SrasVisualization`.

#### Standard deviation: `\sigma = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(x_i-\mu)^2}`

Population standard deviation

Type `STANDARD_DEVIATION` · manifest v1 · formula `\sigma = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(x_i-\mu)^2}`, also `\sigma=\sqrt{\frac{\sum(x_i-\mu)^2}{N}}`, `\sigma = \sqrt{E[(X-\mu)^2]}`.

Parameters: `sigma` (number, default `1.5`, range 0 to 3).

Source: manifest `model-a45393aa052e.js`; view `visualization-3874b1474554.js` → `StandardDeviationVisualization`.

#### Standard score z: `z = \frac{x - \mu}{\sigma}`

Type `STANDARD_SCORE_Z` · manifest v6 · formula `z = \frac{x - \mu}{\sigma}`, also `z = \frac{x - \bar{x}}{s}`, `z = \frac{\bar{x} - \mu_0}{\sigma / \sqrt{n}}`, `z = \frac{\bar{x} - \mu0}{\sigma / \sqrt{n}}`.

Parameters: `x` (number, default `1.2`, range -4 to 4); `mu` (number, default `0`, range -1.5 to 1.5); `sigma` (number, default `1`, range 0.4 to 1.8).

Source: manifest `type-3941c7525dca.js`; view `visualization-9c1e18cf649d.js` → `StandardScoreZVisualization`.

#### States of matter particle model

State of matter

Type `STATES_OF_MATTER_PARTICLE_MODEL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-753dac480589.js` → `Visualization`.

#### Stereo field

Adjust stereo pan

Type `STEREO_FIELD`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-6df7332178db.js` → `StereoFieldVisualization`.

#### Stoichiometric mole ratios: `2\mathrm{H_2} + \mathrm{O_2} \rightarrow 2\mathrm{H_2O}`

Amount of {name} in moles

Type `STOICHIOMETRIC_MOLE_RATIOS` · manifest v3 · formula `2\mathrm{H_2} + \mathrm{O_2} \rightarrow 2\mathrm{H_2O}`.

Parameters: `reactionExtentMoles` (number, default `1`, range 0.5 to 5).

Source: manifest `model-4a23866f1ccf.js`; view `visualization-735785910ce1.js` → `StoichiometricMoleRatiosVisualization`.

#### Stopping distance safe following: `d_{\mathrm{stop}}=d_{\mathrm{reaction}}+d_{\mathrm{braking}}`

Initial speed

Type `STOPPING_DISTANCE_SAFE_FOLLOWING` · manifest v5 · formula `d_{\mathrm{stop}}=d_{\mathrm{reaction}}+d_{\mathrm{braking}}`.

Parameters: `speedKmh` (number, default `60`, range 30 to 100); `reactionTimeSeconds` (number, default `1`, range 0.5 to 2); `roadCondition` (enum, default `dry`, one of `dry`, `wet`, `snow_ice`).

Source: manifest `type-23e40668163a.js`; view `visualization-aa4fcf9b31a4.js` → `StoppingDistanceVisualization`.

#### Storm hydrograph

Rainfall-intensity plot. Peak rainfall occurs at {hour, plural, one {# hour} other {# hours}}; the rainfall event is separate from river discharge and bankfull capacity.

Type `STORM_HYDROGRAPH`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-8c6d38918197.js` → `Visualization`.

#### Straight line depreciation: `D = \frac{C-S}{L}`

Type `STRAIGHT_LINE_DEPRECIATION` · manifest v3 · formula `D = \frac{C-S}{L}`.

Parameters: `costUsd` (number, default `60000`, range 20000 to 100000); `salvageFraction` (number, default `0.1`, range 0 to 0.5); `usefulLifeYears` (integer, default `5`, range 3 to 10); `ageFraction` (number, default `0.4`, range 0 to 1).

Source: manifest `model-586cf7d3fcc3.js`; view `visualization-e56b5c6624ea.js` → `StraightLineDepreciationVisualization`.

#### Stratospheric ozone depletion

Typical stratosphere

Type `STRATOSPHERIC_OZONE_DEPLETION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-9fd8475be1c6.js` → `Visualization`.

#### Stress strain material limits

Type `STRESS_STRAIN_MATERIAL_LIMITS` · manifest v1.

Parameters: `material` (enum, default `steel`, one of `steel`, `aluminum`, `copper`).

Source: manifest `model-dc171645f526.js`; view `visualization-1d3dabdbf428.js` → `StressStrainVisualization`.

#### Strong vs weak acid

Shared acid concentration

Type `STRONG_VS_WEAK_ACID` · manifest v2.

Parameters: `initial_concentration_molar` (number, default `0.15`, range 0.1 to 0.25).

Source: manifest `type-e8c4aa2e5b51.js`; view `visualization-cbbb70a8d66c.js` → `Visualization`.

#### Structural isomers

Example family

Type `STRUCTURAL_ISOMERS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-89c5932c3002.js` → `Visualization`.

#### Subtracting integers

Type `SUBTRACTING_INTEGERS` · manifest v1.

Parameters: `minuend` (integer, default `7`, range 1 to 12); `subtrahend` (integer, default `4`, range 1 to 12).

Source: manifest `model-daf7badaab95.js`; view `visualization-5315d778cb9f.js` → `SubtractingIntegersVisualization`.

#### Subtracting negative integers: `a - n = a + |n|, \quad n < 0`

Type `SUBTRACTING_NEGATIVE_INTEGERS` · manifest v1 · formula `a - n = a + |n|, \quad n < 0`.

Parameters: `positiveInteger` (integer, default `7`, range 1 to 12); `negativeInteger` (integer, default `-4`, range -12 to -1).

Source: manifest `model-fd2977478028.js`; view `visualization-3a3c8ee3e9b8.js` → `SubtractingNegativeIntegersVisualization`.

#### Successive percent change: `100\left(1+\frac{p_1}{100}\right)\left(1+\frac{p_2}{100}\right)`

First percent change

Type `SUCCESSIVE_PERCENT_CHANGE` · manifest v3 · formula `100\left(1+\frac{p_1}{100}\right)\left(1+\frac{p_2}{100}\right)`.

Parameters: `firstChangePercent` (number, default `50`, range -95 to 100); `secondChangePercent` (number, default `-50`, range -100 to 100).

Source: manifest `type-d21946d43d46.js`; view `visualization-69982b335a6a.js` → `SuccessivePercentChangeVisualization`.

#### Supply and demand

Type `SUPPLY_AND_DEMAND` · manifest v4.

Parameters: `demand_shift` (number, default `10`, range -20 to 20); `supply_shift` (number, default `0`, range -20 to 20).

Source: manifest `model-4017459b0c00.js`; view `visualization-9bd61b65d95b.js` → `MarketEquilibriumShiftsVisualization`.

#### Supply curve

Type `SUPPLY_CURVE` · manifest v1.

Parameters: `price` (number, default `5`, range 2 to 8); `supplyShift` (number, default `0`, range -1 to 1).

Source: manifest `type-592d41260a2e.js`; view `visualization-bd597b5db401.js` → `SupplyCurveVisualization`.

#### Supply shock

Signed supply shock

Type `SUPPLY_SHOCK`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d79d585e3b9c.js` → `SupplyShockVisualization`.

#### Surface area cube

Type `SURFACE_AREA_CUBE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-2b37c794b975.js` → `SurfaceAreaCubeVisualization`.

#### Surface area sphere: `S = 4\pi r^2`

Type `SURFACE_AREA_SPHERE` · manifest v3 · formula `S = 4\pi r^2`, also `S = 4\pi r^2;`, `a=4pir^2`, `4pir^2=a`, `4pir^2=s`, `4pir^2`.

Parameters: `radius` (number, default `3`, range 0.01 to 10000).

Source: manifest `template-c6ddf2ee2bfb.js`; view `visualization-9066e31aa327.js` → `SurfaceAreaSphereVisualization`.

#### Surface area to volume ratio

Type `SURFACE_AREA_TO_VOLUME_RATIO` · manifest v1.

Parameters: `side_length` (integer, default `3`, range 1 to 6).

Source: manifest `type-96f57cd357c8.js`; view `visualization-0967b9e465d3.js` → `SurfaceAreaToVolumeRatioVisualization`.

#### Survivorship curves

Relative age as a percentage of maximum lifespan

Type `SURVIVORSHIP_CURVES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f855df9b8d20.js` → `Visualization`.

#### Synaptic transmission

Type `SYNAPTIC_TRANSMISSION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7b939d4cb9e6.js` → `SynapticTransmissionVisualization`.

#### Synth signal flow

LFO destination

Type `SYNTH_SIGNAL_FLOW`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-15a51ef917d0.js` → `Visualization`.

#### Synthetic division

Type `SYNTHETIC_DIVISION` · manifest v1.

Parameters: `dividendCoefficient3` (integer, default `4`, range -20 to 20); `dividendCoefficient2` (integer, default `7`, range -20 to 20); `dividendCoefficient1` (integer, default `-13`, range -20 to 20); `dividendCoefficient0` (integer, default `6`, range -20 to 20); `divisorConstant` (integer, default `3`, range -5 to 5).

Source: manifest `model-dabd83a67c23.js`; view `visualization-976d450c715a.js` → `SyntheticDivisionVisualization`.

#### System of equations

Type `SYSTEM_OF_EQUATIONS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-608cd63f98de.js` → `SystemOfEquationsVisualization`.

#### T distribution: `T=\frac{\bar{x}-\mu}{s/\sqrt{n}}`

Degrees of freedom

Type `T_DISTRIBUTION` · manifest v2 · formula `T=\frac{\bar{x}-\mu}{s/\sqrt{n}}`.

Parameters: `degrees_of_freedom` (integer, default `5`, range 3 to 60); `central_probability` (number, default `0.95`, range 0.9 to 0.99).

Source: manifest `model-23ef77a43b60.js`; view `visualization-cd1f59f06876.js` → `Visualization`.

#### T stat p score

Observed t-statistic

Type `T_STAT_P_SCORE` · manifest v1.

Parameters: `tStatistic` (number, default `2`, range -5 to 5); `degreesOfFreedom` (integer, default `10`, range 1 to 50); `testType` (enum, default `two_sided`, one of `one_sided`, `two_sided`).

Source: manifest `model-2519c21474d3.js`; view `visualization-29918799a219.js` → `TStatPScoreVisualization`.

#### Tangent segments common point: `PA = PB`

Type `TANGENT_SEGMENTS_COMMON_POINT` · manifest v1 · formula `PA = PB`.

Parameters: `radius` (number, default `3.5`, range 2.5 to 4.5); `pointDistance` (number, default `7.2`, range 5.8 to 7.2); `pointAngleDeg` (number, default `180`, range 145 to 215).

Source: manifest `type-32562c107c2d.js`; view `visualization-6afe7206cbf6.js` → `TangentSegmentsCommonPointVisualization`.

#### Tariff

Type `TARIFF`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-de9da41f78be.js` → `Visualization`.

#### Tax incidence and elasticity

Type `TAX_INCIDENCE_AND_ELASTICITY` · manifest v5.

Parameters: `taxPerUnit` (number, default `10`, range 5 to 35); `relativeElasticity` (enum, default `balanced`, one of `balanced`, `demand_more_inelastic`, `supply_more_inelastic`).

Source: manifest `model-49a33d251c4c.js`; view `visualization-e422a4957182.js` → `ExciseTaxVisualization`.

#### Taxes and subsidies

Subsidy per unit

Type `TAXES_AND_SUBSIDIES` · manifest v5.

Parameters: `subsidy_per_unit` (number, default `1.2`, range 0 to 4.2).

Source: manifest `model-cc02c8adab2a.js`; view `visualization-d2fedff637e4.js` → `Visualization`.

#### Taylor series expansion

Type `TAYLOR_SERIES_EXPANSION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a6e27e9fd213.js` → `TaylorSeriesExpansionVisualization`.

#### Tcp three way handshake

TCP handshake stage

Type `TCP_THREE_WAY_HANDSHAKE` · manifest v3.

Parameters: `client_initial_sequence` (integer, default `100`, range 0 to 9998); `server_initial_sequence` (integer, default `400`, range 0 to 9998).

Source: manifest `model-11da4540b9d5.js`; view `visualization-cfc3abb9187d.js` → `TcpThreeWayHandshakeVisualization`.

#### Tcp vs udp

Type `TCP_VS_UDP` · manifest v2.

Parameters: `protocol` (enum, default `tcp`, one of `tcp`, `udp`); `lossMode` (enum, default `drop_packet_3`, one of `none`, `drop_packet_3`).

Source: manifest `model-a7c5b23f898c.js`; view `visualization-8f4d72b5e301.js` → `TcpVsUdpVisualization`.

#### Tempo marking chart

Select a tempo marking

Type `TEMPO_MARKING_CHART`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-67422761f95b.js` → `Visualization`.

#### Tendon reflex

Type `TENDON_REFLEX`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-5a14c8afd034.js` → `TendonReflexVisualization`.

#### Test cross

AA, homozygous dominant

Type `TEST_CROSS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-2350bcf268a2.js` → `Visualization`.

#### Thermohaline circulation

Type `THERMOHALINE_CIRCULATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-7fe862acb1b8.js` → `Visualization`.

#### Three set inclusion exclusion: `|A \cup B \cup C| = |A| + |B| + |C| - |A \cap B| - |A \cap C| - |B \cap C| + |A \cap B \cap C|`

Inclusion-exclusion step

Type `THREE_SET_INCLUSION_EXCLUSION` · manifest v1 · formula `|A \cup B \cup C| = |A| + |B| + |C| - |A \cap B| - |A \cap C| - |B \cap C| + |A \cap B \cap C|`.

Parameters: `setACount` (integer, default `21`, range 12 to 30); `setBCount` (integer, default `21`, range 12 to 30); `setCCount` (integer, default `18`, range 12 to 30).

Source: manifest `model-92f4db76ba27.js`; view `visualization-96b9ecf093ab.js` → `ThreeSetInclusionExclusionVisualization`.

#### Thyroid regulation

Type `THYROID_REGULATION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-17ed4dd2efd2.js` → `ThyroidRegulationVisualization`.

#### Torque

Type `TORQUE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-8ade82fdb1c7.js` → `TorqueVisualization`.

#### Transversal angle relationships

Type `TRANSVERSAL_ANGLE_RELATIONSHIPS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-78175c007d30.js` → `TransversalAngleRelationshipsVisualization`.

#### Trapezoid area

Type `TRAPEZOID_AREA`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-eebe44cdf17c.js` → `TrapezoidAreaVisualization`.

#### Trapezoidal rule

Type `TRAPEZOIDAL_RULE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ac87b081a28a.js` → `IntegrationEstimationVisualization`.

#### Triangle angle sum

Type `TRIANGLE_ANGLE_SUM`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-addbe966518f.js` → `TriangleAngleSumVisualization`.

#### Triangle angle sum proof

Type `TRIANGLE_ANGLE_SUM_PROOF`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-bdf98b4a5d7f.js` → `TriangleAngleSumProofVisualization`.

#### Triangle area: `A = \frac{1}{2}bh`

Type `TRIANGLE_AREA` · manifest v3 · formula `A = \frac{1}{2}bh`, also `A = \frac{1}{2} b h`, `a=bh/2`, `1/2bh=a`, `bh/2=a`, `1/2bh`, `b = \frac{2A}{h}`, `h = \frac{2A}{b}`.

Parameters: `base` (number, default `8`, range 0.01 to 10000); `height` (number, default `6`, range 0.01 to 10000).

Source: manifest `type-cb23494cad1e.js`; view `visualization-184f78b1b7cc.js` → `TriangleAreaVisualization`.

#### Trig angle sum identity

Type `TRIG_ANGLE_SUM_IDENTITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-177fe815f1d6.js` → `TrigAngleSumIdentityVisualization`.

#### Trig identity pythagorean

Type `TRIG_IDENTITY_PYTHAGOREAN`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-972dedc098ed.js` → `TrigIdentityVisualization`.

#### Trig inverse

Graph of the inverse trigonometric function. The highlighted point has input {inputValue} and theta {angleRadiansCount, plural, one {{angleRadians} radian} other {{angleRadians} radians}}, about {angleDegreesCount, plural, one {{angleDegrees} degree} other {{angleDegrees} degrees}}.

Type `TRIG_INVERSE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f7049048933f.js` → `TrigInverseVisualization`.

#### Trig ratio tangent: `\tan(\theta) = \frac{\sin(\theta)}{\cos(\theta)}`

Type `TRIG_RATIO_TANGENT` · manifest v4 · formula `\tan(\theta) = \frac{\sin(\theta)}{\cos(\theta)}`, also `\tan x = \frac{\sin x}{\cos x}`, `\tan(\theta)=\frac{opposite}{adjacent}`.

Parameters: `angleDeg` (number, default `35`, range 0.01 to 89.99); `angleLabel` (enum, default `θ`, one of `θ`, `α`, `β`, `φ`, `γ`).

Source: manifest `type-ffe33386dff8.js`; view `visualization-a7485ca4495d.js` → `TrigRatioTangentVisualization`.

#### Two cable static equilibrium

Type `TWO_CABLE_STATIC_EQUILIBRIUM` · manifest v2.

Parameters: `leftAngleDegrees` (number, default `45`, range 10 to 80); `rightAngleDegrees` (number, default `45`, range 10 to 80); `weightNewtons` (number, default `200`, range 50 to 500).

Source: manifest `type-3854ea3b6661.js`; view `visualization-b490491d75b7.js` → `TwoCableEquilibriumVisualization`.

#### Two digit multiply

First two-digit factor

Type `TWO_DIGIT_MULTIPLY` · manifest v1.

Parameters: `factor1` (integer, default `24`, range 10 to 99); `factor2` (integer, default `87`, range 10 to 99).

Source: manifest `model-848a1637af6a.js`; view `visualization-a841d6321964.js` → `TwoDigitMultiplyVisualization`.

#### Two dimensional array indexing

Row index

Type `TWO_DIMENSIONAL_ARRAY_INDEXING` · manifest v2.

Parameters: `rows` (integer, default `3`, range 2 to 5); `columns` (integer, default `5`, range 2 to 6).

Source: manifest `model-6157f9be0476.js`; view `visualization-c513c0e6f183.js` → `Visualization`.

#### Two sample t test

Observed difference between group means

Type `TWO_SAMPLE_T_TEST` · manifest v2.

Parameters: `meanDifference` (number, default `1.5`, range -3 to 3); `standardError` (number, default `0.75`, range 0.75 to 3); `degreesOfFreedom` (number, default `20`, range 2 to 200).

Source: manifest `model-2470e84b6d61.js`; view `visualization-a9e6816b05a9.js` → `TwoSampleTTestVisualization`.

#### Twos complement

Type `TWOS_COMPLEMENT` · manifest v3.

Parameters: `bit_width` (enum, default `8`, one of `4`, `8`, `16`); `initial_value` (integer, default `-4`, range -32768 to 32767).

Source: manifest `model-467b7dfbb450.js`; view `visualization-345914d25adc.js` → `TwosComplementVisualization`.

#### Type i type ii power

Significance level

Type `TYPE_I_TYPE_II_POWER`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d650d6b0a02f.js` → `TypeITypeIIPowerVisualization`.

#### Union probability inclusion exclusion

Type `UNION_PROBABILITY_INCLUSION_EXCLUSION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-1f514cede3d2.js` → `UnionProbabilityInclusionExclusionVisualization`.

#### Unit circle: `x^2 + y^2 = 1`

Type `UNIT_CIRCLE` · manifest v3 · formula `x^2 + y^2 = 1`, also `1 = x^2 + y^2`, `x^2 + y^2 = 1^2`, `(x-0)^2 + (y+0)^2 = 1`, `(\cos\theta, \sin\theta)`.

Parameters: `angleDeg` (number, default `45`, range -36000 to 36000).

Source: manifest `type-4677b661e846.js`; view `visualization-f746589f538d.js` → `UnitCircleVisualization`.

#### Urbanization and impervious surfaces

Land cover

Type `URBANIZATION_AND_IMPERVIOUS_SURFACES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-258dd7c19ff3.js` → `UrbanizationVisualization`.

#### Vapor pressure

Type `VAPOR_PRESSURE` · manifest v5.

Parameters: `initial_temperature_c` (number, default `25`, range 0 to 60); `surrounding_pressure_kpa` (number, default `101.325`, range 40 to 160).

Source: manifest `type-15f2f7d7853c.js`; view `visualization-b482e4c4d41d.js` → `VaporPressureVisualization`.

#### Vapor pressure lowering: `P_{\mathrm{solution}}=X_{\mathrm{solvent}}P^\circ_{\mathrm{solvent}}`

Nonvolatile-solute mole fraction

Type `VAPOR_PRESSURE_LOWERING` · manifest v3 · formula `P_{\mathrm{solution}}=X_{\mathrm{solvent}}P^\circ_{\mathrm{solvent}}`.

Parameters: `pure_solvent_vapor_pressure_kpa` (number, default `100`, range 10 to 200).

Source: manifest `model-715993df7e45.js`; view `visualization-1cfb6ba09861.js` → `VaporPressureLoweringVisualization`.

#### Variance

Type `VARIANCE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-298d80dd5d64.js` → `VarianceVisualization`.

#### Vector components: `x=r\cos\theta,\qquad y=r\sin\theta`

Type `VECTOR_COMPONENTS` · manifest v2 · formula `x=r\cos\theta,\qquad y=r\sin\theta`, also `\vec v=\langle r\cos\theta,\ r\sin\theta\rangle`, `(x,y)=(r\cos\theta,r\sin\theta)`.

Parameters: `magnitude` (number, default `6`, range 0.1 to 100); `angleDeg` (number, default `35`, range -180 to 180).

Source: manifest `type-f1e9ea4637a1.js`; view `visualization-c678aba4b4e5.js` → `VectorComponentsVisualization`.

#### Vector dot product

Vector {vector}, {component} component

Type `VECTOR_DOT_PRODUCT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3db10067bfa1.js` → `VectorDotProductVisualization`.

#### Vector projection

Type `VECTOR_PROJECTION`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-fe605c2f2af8.js` → `VectorProjectionVisualization`.

#### Velocity as slope graph: `v = \frac{\Delta x}{\Delta t}`

Position point at {timeCount, plural, one {{time} second} other {{time} seconds}} and {positionCount, plural, one {{position} meter} other {{position} meters}}. Drag vertically or use the Up and Down arrow keys to change its position.

Type `VELOCITY_AS_SLOPE_GRAPH` · manifest v5 · formula `v = \frac{\Delta x}{\Delta t}`.

Parameters: `positionAt0SecondsMeters` (number, default `-3`, range -10 to 10); `positionAt2_5SecondsMeters` (number, default `4`, range -10 to 10); `positionAt5SecondsMeters` (number, default `4`, range -10 to 10); `positionAt7_5SecondsMeters` (number, default `-2`, range -10 to 10); `positionAt10SecondsMeters` (number, default `3`, range -10 to 10).

Source: manifest `model-372acd82c554.js`; view `visualization-4d93228eb46a.js` → `VelocityAsSlopeGraphVisualization`.

#### Venn diagram two set counting

Type `VENN_DIAGRAM_TWO_SET_COUNTING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f254ffbab3b3.js` → `VennDiagramTwoSetCountingVisualization`.

#### Virus life cycle

Type `VIRUS_LIFE_CYCLE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-54a6e4d0d3b3.js` → `VirusLifeCycleVisualization`.

#### Visual fields

Type `VISUAL_FIELDS`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-d098a95f0695.js` → `VisualFieldsVisualization`.

#### Vocal ranges

Vocal classification

Type `VOCAL_RANGES`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-617c5ce7d055.js` → `Visualization`.

#### Volume cube

Type `VOLUME_CUBE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-4cdbdcc8e0ec.js` → `VolumeCubeVisualization`.

#### Waste hierarchy

Type `WASTE_HIERARCHY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-ee985327ea64.js` → `Visualization`.

#### Wastewater treatment

Wastewater treatment stage

Type `WASTEWATER_TREATMENT`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-aeab022dfd4d.js` → `WastewaterTreatmentVisualization`.

#### Water phase diagram

Temperature in degrees Celsius

Type `WATER_PHASE_DIAGRAM` · manifest v2.

Parameters: `temperature_c` (number, default `25`, range -80 to 450); `pressure_kpa` (number, default `101.325`, range 0.001 to 50000).

Source: manifest `type-9acfe2203543.js`; view `visualization-2725d5be51eb.js` → `WaterPhaseDiagramVisualization`.

#### Water polarity

Move neighboring water horizontally

Type `WATER_POLARITY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-f134a8dbcf94.js` → `Visualization`.

#### Water potential

Magnitude of the negative solute potential on the right

Type `WATER_POTENTIAL`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-55d5877e22a4.js` → `WaterPotentialVisualization`.

#### Wave speed: `v = f\lambda`

Type `WAVE_SPEED` · manifest v3 · formula `v = f\lambda`, also `\nu = \frac{c}{\lambda}`, `v = f lambda`, `v=flambda`, `v=lambdaf`, `flambda=v`, `lambdaf=v`, `f=v/lambda`, `lambda=v/f`.

Parameters: `frequency` (number, default `2`, range 0.1 to 20000); `wavelength` (number, default `3`, range 0.1 to 10000).

Source: manifest `type-ac19101079c5.js`; view `visualization-6ab3db24d48f.js` → `WaveSpeedVisualization`.

#### Waveform anatomy

Choose the horizontal axis

Type `WAVEFORM_ANATOMY`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-a31a6afde7fc.js` → `WaveformAnatomyVisualization`.

#### Weight force: `F_g = mg`

Type `WEIGHT_FORCE` · manifest v3 · formula `F_g = mg`, also `F_G = m g`, `w = mg`, `F_g = m\,g`, `P = m \cdot g`, `F_g = m \cdot g`, `F_g = m \times g`, `m = \frac{F_g}{g}`, `g = \frac{F_g}{m}`.

Parameters: `mass` (number, default `8`, range 0.01 to 10000); `gravity` (number, default `9.8`, range 0 to 10000).

Source: manifest `type-722d579b6777.js`; view `visualization-b17ca372ff17.js` → `WeightForceVisualization`.

#### Wetland filtration and flood buffering

Wetland condition

Type `WETLAND_FILTRATION_AND_FLOOD_BUFFERING`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-5418d22e3d75.js` → `Visualization`.

#### While loop boolean condition

Starting counter

Type `WHILE_LOOP_BOOLEAN_CONDITION` · manifest v2.

Parameters: `initial_counter` (integer, default `2`, range 0 to 8); `stopping_bound` (integer, default `5`, range 0 to 8).

Source: manifest `type-161aea9178de.js`; view `visualization-eee1c513472e.js` → `WhileLoopVisualization`.

#### Wilcoxon rank sum

Sample pattern

Type `WILCOXON_RANK_SUM` · manifest v2.

Parameters: `initial_pattern` (enum, default `intermingled`, one of `intermingled`, `group-a-lower`, `group-a-higher`, `ties`).

Source: manifest `model-65fc78301123.js`; view `visualization-61843fdd9893.js` → `WilcoxonRankSumVisualization`.

#### Wind turbine

Wind-turbine power curve. At {windSpeedCount, plural, one {{windSpeed} metre per second} other {{windSpeed} metres per second}} the turbine is in {region} and produces {power}. Cut-in is 3, rated speed is 12, and cut-out is 25 metres per second. The vertical scale is percentage of rated power.

Type `WIND_TURBINE` · manifest v3.

Parameters: `rated_power_kw` (number, default `3000`, range 100 to 20000).

Source: manifest `type-3f4953af8baf.js`; view `visualization-e3f6e3f394a8.js` → `Visualization`.

#### Withdrawal reflex

Withdrawal reflex stage

Type `WITHDRAWAL_REFLEX`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-3ee804486de8.js` → `WithdrawalReflexVisualization`.

#### Work done by force

Type `WORK_DONE_BY_FORCE`.

Source: manifest `analytics-15ea16e918ba.js (inline)`; view `visualization-415a38eacea9.js` → `WorkDoneByForceVisualization`.

#### Z score p value

Observed z-score

Type `Z_SCORE_P_VALUE` · manifest v3.

Parameters: `zScore` (number, default `1.96`, range -3.5 to 3.5); `testType` (enum, default `two-sided`, one of `one-sided`, `two-sided`).

Source: manifest `model-a9901c18f348.js`; view `visualization-717f835b427a.js` → `ZScorePValueVisualization`.

#### Zero based array indexing

Type `ZERO_BASED_ARRAY_INDEXING` · manifest v2.

Parameters: `initial_length` (integer, default `6`, range 1 to 8).

Source: manifest `model-f9237046088a.js`; view `visualization-714ff4fc9147.js` → `ZeroBasedArrayIndexingVisualization`.

### Manifest only (no renderer registered in this build) (29)

#### Animal pollination

Type `ECOSYSTEM_SERVICE_ANIMAL_POLLINATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-50b2f833c6f4.js`.

#### Animal-virus genome replication and capsid assembly

Type `ANIMAL_VIRUS_GENOME_REPLICATION_AND_CAPSID_ASSEMBLY` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-6780214dbd77.js`.

#### Animal-virus latency and reactivation

Type `ANIMAL_VIRUS_LATENCY_AND_REACTIVATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3eac81719681.js`.

#### Animal-virus receptor binding and host range

Type `ANIMAL_VIRUS_RECEPTOR_BINDING_AND_HOST_RANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-c8bee44375f5.js`.

#### Aquatic photic and aphotic light-depth zones

Type `BIOME_AQUATIC_PHOTIC_AND_APHOTIC_ZONES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-308d0e89eeab.js`.

#### Desert plant water conservation

Type `BIOME_DESERT_PLANT_WATER_CONSERVATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-550b911e2ad9.js`.

#### Energy pyramid

Type `ENERGY_PYRAMID` · manifest v3.

Parameters: `producer_energy` (number, default `10000`, range 1000 to 100000); `transfer_efficiency_percent` (number, default `10`, range 5 to 20).

Source: manifest `type-402ae30c42ae.js`.

#### Entropy of phase changes: `\Delta S_{\mathrm{phase}}=\frac{\Delta H_{\mathrm{phase}}}{T_{\mathrm{phase}}}`

Type `ENTROPY_OF_PHASE_CHANGES` · manifest v4 · formula `\Delta S_{\mathrm{phase}}=\frac{\Delta H_{\mathrm{phase}}}{T_{\mathrm{phase}}}`.

Parameters: `melting_temperature_k` (number, default `273.15`, range 200 to 350); `boiling_temperature_k` (number, default `373.15`, range 360 to 650); `molar_enthalpy_of_fusion_kj_per_mol` (number, default `6.01`, range 2 to 20); `molar_enthalpy_of_vaporization_kj_per_mol` (number, default `40.65`, range 20 to 100).

Source: manifest `type-6211dfc72928.js`.

#### Enveloped versus non-enveloped animal viruses

Type `ENVELOPED_VERSUS_NON_ENVELOPED_ANIMAL_VIRUSES` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-815448353c97.js`.

#### Enveloped-virus budding and envelope acquisition

Type `ENVELOPED_VIRUS_BUDDING_AND_ENVELOPE_ACQUISITION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-811713f4a622.js`.

#### Enveloped-virus membrane fusion and uncoating

Type `ENVELOPED_VIRUS_MEMBRANE_FUSION_AND_UNCOATING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-184c3b039621.js`.

#### Eukaryotic virus host-cell infection cycle

Type `EUKARYOTIC_VIRUS_HOST_CELL_INFECTION_CYCLE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-49e316e8efab.js`.

#### Exponential population growth: `N(t)=N_0(1+r)^t`

Type `EXPONENTIAL_POPULATION_GROWTH` · manifest v3 · formula `N(t)=N_0(1+r)^t`.

Parameters: `initial_population` (integer, default `200`, range 20 to 2000); `growth_rate_percent` (number, default `10`, range 4 to 15); `elapsed_periods` (number, default `10`, range 0 to 20).

Source: manifest `type-5da229a6a104.js`.

#### Inflation cpi

Type `INFLATION_CPI` · manifest v2.

Parameters: `earlier_cpi` (number, default `120`, range 50 to 300); `later_cpi` (number, default `126`, range 50 to 300); `comparison_interval` (enum, default `twelve_months`, one of `one_month`, `twelve_months`).

Source: manifest `type-f80006839631.js`.

#### Ipv4 subnetting cidr

Type `IPV4_SUBNETTING_CIDR` · manifest v2.

Parameters: `address_octet_1` (integer, default `192`, range 128 to 223); `address_octet_2` (integer, default `168`, range 128 to 239); `address_octet_3` (integer, default `1`, range 0 to 255); `address_octet_4` (integer, default `75`, range 0 to 255); `prefix_length` (integer, default `26`, range 24 to 30).

Source: manifest `type-103197d7f37d.js`.

#### Monthly temperature and precipitation climograph

Type `BIOME_MONTHLY_TEMPERATURE_PRECIPITATION_CLIMOGRAPH` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-153a2f5851e4.js`.

#### Non-enveloped-virus cell lysis and release

Type `NON_ENVELOPED_VIRUS_CELL_LYSIS_AND_RELEASE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-f82f0a970c7b.js`.

#### Non-enveloped-virus endocytosis and uncoating

Type `NON_ENVELOPED_VIRUS_ENDOCYTOSIS_AND_UNCOATING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-95dd63dfb100.js`.

#### Retroviral reverse transcription and integration

Type `RETROVIRAL_REVERSE_TRANSCRIPTION_AND_INTEGRATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-742314b793ee.js`.

#### Seasonal tundra active layer above permanent permafrost

Type `BIOME_TUNDRA_ACTIVE_LAYER_AND_PERMAFROST` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-8924d3f45e80.js`.

#### Temperate deciduous forest seasonality

Type `BIOME_TEMPERATE_FOREST_SEASONAL_LEAF_CHANGE` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-197658cebff3.js`.

#### Temperature, precipitation, and vegetation

Type `BIOME_TEMPERATURE_PRECIPITATION_VEGETATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-3c3d4ddf8eae.js`.

#### Tropical rainforest canopy layers

Type `BIOME_TROPICAL_RAINFOREST_CANOPY_LAYERS` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d871c36afffe.js`.

#### Vegetation and roots reduce rainfall-driven soil erosion

Type `ECOSYSTEM_SERVICE_VEGETATION_SOIL_EROSION_PREVENTION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-b9a15c3acd3e.js`.

#### Viral mutation and antigenic recognition

Type `VIRAL_MUTATION_AND_ANTIGENIC_RECOGNITION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-9ff98c337bc8.js`.

#### Wetland flood buffering

Type `ECOSYSTEM_SERVICE_WETLAND_FLOOD_BUFFERING` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-d5b67a9d1e52.js`.

#### Wetland water filtration

Type `ECOSYSTEM_SERVICE_WETLAND_WATER_FILTRATION` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-1d171e6c132f.js`.

#### Whittaker annual climate and terrestrial biome diagram

Type `BIOME_WHITTAKER_CLIMATE_DIAGRAM` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-36653fcd2e7f.js`.

#### Windward rainfall and a mountain rain shadow

Type `BIOME_OROGRAPHIC_RAIN_SHADOW` · manifest v1 · animated thumbnail · not in the type enum.

Source: manifest `type-79754ddd4084.js`.
